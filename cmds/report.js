/*
  This module supports the 'report' command of the 'studiorpt' CLI program.
*/
const ora = require('ora');
const error = require('../src/error');
const helpers = require('@jlafer/twilio-helpers');
const {readJsonFile} = require('jlafer-node-util');
const R = require('ramda');

const getPropFromContext = R.curry((context, accum, field) => 
  ({...accum, [field.name]: R.path(field.path, context)})
);

const stepToRpt = R.curry((execution, context, stepAndContext) => {
  const {step, context: stepContext} = stepAndContext;
  console.log('step:', step);
  console.log('stepContext:', stepContext);
  const {sid, name, transitionedFrom, transitionedTo, dateCreated} = step;
  return {sid, name, transitionedFrom, transitionedTo, dateCreated};
});
const reportExecution = R.curry( async (client, flow, cfg, execAndContext) => {
  const {friendlyName, version} = flow;
  const {execution, context} = execAndContext;
  const {sid, accountSid, dateCreated, dateUpdated} = execution;
  //DEBUG
  if (sid === 'FN9b9ece42fbbb8e99efee990bf44d479c') {
    console.log('execution: ', execution);
    console.log('context: ', context);
  }
  const steps = await helpers.getSteps(client, flow.sid, execution.sid);
  const stepRpts = steps.map(stepToRpt(execution, context));
  const call = context.context.trigger.call;
  let callProps = {};
  if (call) {
    const {CallSid, From, To} = call;
    callProps.callSid = CallSid;
    callProps.from = From;
    callProps.to = To;
  };
  const customFlds = cfg.fields.reduce(getPropFromContext(context), {});
  const rpt = {
    sid,
    accountSid,
    appName: friendlyName,
    appVersion: version,
    startTime: dateCreated,
    endTime: dateUpdated,
    ...callProps,
    ...customFlds,
    stepRpts: stepRpts
  };
  return rpt;
});

module.exports = async (args) => {
  const {acct, auth, flowSid, fromDt, toDt, cfgPath} = args;

  const spinner = ora().start();
  const client = require('twilio')(acct, auth);

  const cfg = await readJsonFile(cfgPath);
  const flow = await helpers.getWorkflow(client, flowSid);
  helpers.getExecutions(client, flowSid, fromDt, toDt)
  .then(execs =>
    Promise.all(execs.map(reportExecution(client, flow, cfg)))
  )
  .then((execRpts) => {
    spinner.stop();
    execRpts.forEach(execRpt => console.log(execRpt));
  })
  .catch(err => {
    spinner.stop();
    console.log('error:', err)
    error(`${err}`);
  });
};