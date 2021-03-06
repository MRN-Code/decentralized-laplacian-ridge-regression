'use strict';

const n = require('numeric');

module.exports = {
  /**
   * Compute regression error for a set of samples (objective).
   *
   * @note See [Eqn 6]
   *
   * @example <caption>Example `xVals`</caption>
   * const xVals = [
   *   [<diagnosis 1>, <gender 1>, <age 1>, ...],
   *   [<diagnosis 2>, <gender 2>, <age 2>, ...],
   *   [<diagnosis 3>, <gender 3>, <age 3>, ...],
   *   // ...
   * ];
   *
   * @param {Array} w Betas or coefficients: an array of betas corresponding to
   * each `xVal`
   * @param {Array[]} xVals 2D array where each sub-array contains all xVals for
   * a single sample in the same order as `w` and `yVals
   * @param {Array} yVals `y` values for each sample in `xVals`. In the case of
   * the FreeSurfer computation, `yVals` is an array of numbers, where a number
   * is a region of interest's value.
   * @param  {number} lambda "regularizer"
   * @return {number} error score
   */
  objective(w, xVals, yVals, lambda) {
    return n.sum(n.pow(n.sub(yVals, n.dot(xVals, w)), 2)) +
      (lambda * n.dot(w, w) * 0.5);
  },

  /**
   * Compute the local gradient of the object function
   * @note See [Eqn 9]
   * @param  {array}  w   (aka betas or coefficients): array of betas to
   *                          correspond to each xVal.
   * @param  {array}  xVals   2D array where each sub-array contains all xVals
   *                          for a single sample in the same order as
   *                          initialMVals
   * @param  {array}  yVals   array of y values for each sample in xVals
   * @param  {number} lambda
   * @return {array}  gradient values for each mVal
   */
  gradient(w, X, y, lambda) {
    return n.add(
      n.mul(
        -2,
        n.dot(n.transpose(X), n.sub(y, n.dot(X, w)))
      ),
      n.mul(lambda, w)
    );
  },

  /**
   * minimize a set of regressors against the objective function and
   * response set
   * @param  {array} xVals    2D array where each sub-array contains all xVals
   *                          for a single sample in the same order as
   *                          initialMVals
   * @param  {array}  yVals   array of y values for each sample in xVals
   * @param {number} lambda
   * @return {array}  w in same order as initialMVals
   */
  oneShot(xVals, yVals, lambda) {
    const initialMVals = n.random(n.dim(xVals[0]));
    /* eslint-disable no-console */
    console.log('xVals are:', xVals);
    console.log('yVals are:', yVals);
    console.log('localInitialMVals are:', initialMVals);
    /* eslint-enable no-console */
    return n.uncmin(w => this.objective(w, xVals, yVals, lambda), initialMVals, 0.001).solution;
  },

  /**
   * calculate new w based on previous w, gradients and a learningRate
   * @param  {number} learningRate    the rate applied to the gradient
   * @param  {array} w            the previous w which gradients were
   *                                  calculated from
   * @param  {array} gradients        the gradients calculated from the w
   * @return {array}                  the new w (betas)
   */
  recalculateMVals(learningRate, w, gradients) {
    return n.sub(w, n.dot(learningRate, gradients));
  },

  /**
   * Apply w (aka coefficients or betas) to x values, then sum results
   * eg `y = m1 * x1 + m2 * x2...`
   * @param  {array} w array of coefficents (betas)
   * @param  {array} xVals       array of x values
   * @return {number}             result (y value)
   */
  applyModel(w, xVals) {
    return n.dot(xVals, w);
  },

  /** Calculate r squared (goodness of fitting) **/
  rSquared(xVals, yVals, betaVector) {
    const SSresidual = n.sum(n.pow(n.sub(yVals, n.dot(xVals, betaVector)), 2));
    const meanyVals = n.sum(yVals) / yVals.length;
    const SStotal = n.sum(n.pow(n.sub(yVals, n.rep(n.dim(yVals), meanyVals)), 2));
    return 1 - (SSresidual / SStotal);
  },

  /** Calculate tValues (regressor significance) **/
  tValue(xVals, yVals, betaVector) {
    const varError = (1 / (n.dim(yVals) - n.dim(betaVector))) *
      (n.sum(n.pow(n.sub(yVals, n.dot(xVals, betaVector)), 2)));
    const varBeta = n.mul(n.inv(n.dot(n.transpose(xVals), xVals)), varError);
    // initialize seBeta list
    const seBeta = [];
    for (let i = 0; i < betaVector.length; i += 1) {
      seBeta.push(Math.sqrt(varBeta[i][i]));
    }
    // calcualte the T value from seBeta
    const tValue = [];
    for (let i = 0; i < betaVector.length; i += 1) {
      tValue.push(betaVector[i] / seBeta[i]);
    }
    return tValue;
  },

};
