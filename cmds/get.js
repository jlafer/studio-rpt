/*
  This module supports the 'get' command of the 'studiorpt' CLI program.
*/
const ora = require('ora');
const error = require('../src/error');
var helpers = require('@jlafer/twilio-helpers');

module.exports = (args) => {
  const {acct, auth, flowSid, type, sid} = args;
  let getFn, logFn;

  switch (type) {
    case 'workflow':
      getFn = helpers.getWorkflow;
      logFn = helpers.logWorkflow;
      break;
  }
  const spinner = ora().start();
  const client = require('twilio')(acct, auth);
  getFn(client, flowSid, sid)
  .then((obj) => {
    spinner.stop();
    logFn(obj)
  })
  .catch(err => {
    spinner.stop();
    console.log('error:', err)
    error(`${err}`);
  });
};
