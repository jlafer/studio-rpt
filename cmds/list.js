/*
  This module supports the 'list' command of the 'trcli' CLI program.
*/
const ora = require('ora');
const error = require('../src/error');
var helpers = require('@jlafer/twilio-helpers');

module.exports = (args) => {
  const {acct, auth, type, flow, sid, fromDt, toDt} = args;
  let promise, logFn;

  const spinner = ora().start();
  const client = require('twilio')(acct, auth);

  switch (type) {
    case 'workflow':
      promise = helpers.getWorkflows(client);
      logFn = helpers.logWorkflow;
      break;
    case 'execution':
      promise = helpers.getExecutions(client, flow, fromDt, toDt);
      logFn = helpers.logExecution;
      break;
    case 'step':
      promise = helpers.getSteps(client, flow, sid);
      logFn = helpers.logStep;
      break;
  }
  promise
  .then((objs) => {
    spinner.stop();
    objs.forEach(logFn)
  })
  .catch(err => {
    spinner.stop();
    console.log('error:', err)
    error(`${err}`);
  });
};