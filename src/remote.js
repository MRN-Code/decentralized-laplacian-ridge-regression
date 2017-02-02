'use strict';

const get = require('lodash/get');
const n = require('numeric');
const DEFAULT_MAX_ITERATIONS = require('./constants').DEFAULT_MAX_ITERATIONS;

const DEFAULT_OBJECTIVE = 1e15;
const GRADIENT_TOLERANCE = 1e-3;

module.exports = {
  defaultW: null, // may be overwritten for unit testing

  assertUserDatas(opts) {
    opts.userResults.forEach((usrRslt, ndx, arr) => {
      if (ndx === 0) { return; }
      const numFeatures = usrRslt.data.numFeatures;
      const lastNumFeatures = arr[ndx - 1].data.numFeatures;
      if (numFeatures !== lastNumFeatures) {
        const un = usrRslt.username;
        const lastUn = arr[ndx - 1].username;
        throw new Error([
          `${un} reports ${numFeatures} features, but ${lastUn}`,
          `reports ${lastNumFeatures} features.`,
        ].join(' '));
      }
    });
  },

  /**
   * compute server entry point
   * @param {Object} opts
   * @param {Object} opts.pluginState
   * @param {(Object|null)} opts.previousData
   * @param {string[]} opts.usernames
   * @param {Object[]} opts.userResults Collection of users' local results
   * documents
   * @returns {Object}
   */
  run(opts) {
    const userResults = opts.userResults;
    const r = Object.assign({
      currW: null,
      prevW: null,
      prevObjective: null,
      currObjective: null,
      eta: null,
      iteration: 0,
    }, opts.previousData || {});

    const maxIterationCount = get(
      opts,
      'pluginState.inputs[0][1]',
      DEFAULT_MAX_ITERATIONS
    );

    this.assertUserDatas(opts);

    // initialize group data
    if (r.iteration === 0) {
      const firstUserResult = userResults[0].data;
      r.currW = r.prevW = this.defaultW || n.random([firstUserResult.numFeatures]);
      r.prevObjective = DEFAULT_OBJECTIVE;
      r.Gradient = n.rep([firstUserResult.numFeatures], 0);
      r.eta = userResults[0].data.eta;
      r.lambda = userResults[0].data.lambda;
      r.Eg2 = n.rep([firstUserResult.numFeatures], 0);
      r.EdW = n.rep([firstUserResult.numFeatures], 0);
      r.rho = 0.5; // watch out for this and the eps
      r.eps = 0.1;
      r.deltaW = 0;
      r.iteration = 1;
      return r;
    }
    r.iteration += 1;

    r.currObjective = userResults.reduce((prev, rslt) => prev + rslt.data.lObj, 0);

    // ADADELTA
    r.Gradient = userResults.reduce((prev, rslt) => n.add(prev, rslt.data.lGrad), 0);
    r.Eg2 = n.add(n.mul(r.rho, r.Eg2), n.mul(1 - r.rho, n.mul(r.Gradient, r.Gradient)));
    r.deltaW = n.mul(-1, n.mul(n.div(n.sqrt(n.add(r.EdW, r.eps)), n.sqrt(n.add(r.Eg2, r.eps))), r.Gradient)); // eslint-disable-line
    r.EdW = n.add(n.mul(r.rho, r.EdW), n.mul(1 - r.rho, n.mul(r.deltaW, r.deltaW)));
    r.currW = n.add(r.prevW, r.deltaW);

    // test for halting conditions.
    if (
      r.currObjective > r.prevObjective ||
      n.norm2(r.Gradient) < GRADIENT_TOLERANCE ||
      r.iteration === maxIterationCount
    ) {
    // indicate the iteration for searching converged W is ended
      r.endOfIteration = true;
      r.statisticStep = 0;
      return r;
    }

    // continue iterating.
    r.prevObjective = r.currObjective;
    r.prevW = r.currW;

    console.log(r); // eslint-disable-line no-console

    return r;
  },
};
