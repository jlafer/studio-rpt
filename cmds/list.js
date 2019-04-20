/*
  This module supports the 'list' command of the 'trcli' CLI program.
*/
const ora = require('ora');
const error = require('../src/error');
var helpers = require('@jlafer/twilio-helpers');

module.exports = (args) => {
  const {acct, auth, type, flow, sid} = args;
  let listFn, logFn;

  switch (type) {
    case 'workflow':
      listFn = helpers.getWorkflows;
      logFn = helpers.logWorkflow;
      break;
    case 'execution':
      listFn = helpers.getExecutions;
      logFn = helpers.logExecution;
      break;
    case 'step':
      listFn = helpers.getSteps;
      logFn = helpers.logStep;
      break;
  }
  const spinner = ora().start();
  const client = require('twilio')(acct, auth);
  listFn(client, flow, sid)
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