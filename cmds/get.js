/*
  This module supports the 'get' command of the 'trcli' CLI program.
*/
const ora = require('ora');
const error = require('../src/error');
var helpers = require('@jlafer/twilio-helpers');

module.exports = (args) => {
  const {acct, auth, wrkspc, type, sid} = args;
  let getFn, logFn;

  switch (type) {
    case 'task':
      getFn = helpers.getTask;
      logFn = helpers.logTask;
      break;
  }
  const spinner = ora().start();
  const client = require('twilio')(acct, auth);
  getFn(client, wrkspc, sid)
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
