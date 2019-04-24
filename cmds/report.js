/*
  This module supports the 'report' command of the 'studiorpt' CLI program.
*/
const ora = require('ora');
const error = require('../src/error');
const helpers = require('@jlafer/twilio-helpers');
const {readJsonFile} = require('jlafer-node-util');
const R = require('ramda');

//R.path(field.path, context)

const passesFilter = (stepAndContext, filter) => {
  const {step, context: stepContext} = stepAndContext;
  switch (filter.type) {
    case 'name':
      if (filter.value === step.transitionedTo) {
        console.log(`passesFilter: passed ${filter.value} by name`)
        return true;
      }
      else
        return false;
    default:
      console.log(`passesFilter: ${filter.type} is an unsupported filter type!`);
      return false;
  }
};

const stepFilter = R.curry((filters, stepAndContext) => {
  for (let filter of filters) {
    if (! passesFilter(stepAndContext, filter))
      return false;
  }
  console.log(`stepFilter: passed ${stepAndContext.step.sid}`)
  return true;
});

const dataGetter = R.curry((dataSpec, stepAndContext) => {
  const {step, context: stepContext} = stepAndContext;
  if (Array.isArray(dataSpec)) {
    console.log(`dataGetter: context`, stepContext);
    console.log(`dataGetter: returning ${R.path(dataSpec, stepContext)}`);
    return R.path(dataSpec, stepContext);
  }
  if (typeof dataSpec === 'string')
    return step.transitionedTo;
  if (typeof dataSpec === 'number' && dataSpec == 1)
    return 1;
  console.log(`dataGetter: ${dataSpec} is an unsupported data spec!`);
  return 0;
});

const dataToValueMapper = R.curry((map, value) => {
  if (map === 'identity')
    return value;
  console.log(`dataToValueMapper: ${map} is an unsupported value map function!`);
  return value;
});

const valueAggregator = R.curry((agg, accum, value) => {
  let result;
  if (accum == null) {
    if (['sum', 'unique', 'elapsed'].includes(agg))
      result = 0;
    // NOTE: the else clause may not be needed bcos other aggs are assignments
    else
      if (typeof value === 'number')
        result = 0;
      else
        result = '';
  }
  else
    result = accum;
  switch (agg) {
    case 'sum':
      return (result + value);
    case 'last':
      return value;
    default:
      console.log(`valueAggregator: ${agg} is an unsupported agg function!`);
      return value;
  }
});

const calculateValue = R.curry((steps, field) => {
  const value = steps.filter(stepFilter(field.filters))
  .map(dataGetter(field.data))
  .map(dataToValueMapper(field.map))
  .reduce(valueAggregator(field.agg), null)
  return {...field, value: (value || field.default)};
});

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
  const customFlds = cfg.fields.map(calculateValue(steps));
  const stepRpts = steps.map(stepToRpt(execution, context));
  const call = context.context.trigger.call;
  let callProps = {};
  if (call) {
    const {CallSid, From, To} = call;
    callProps.callSid = CallSid;
    callProps.from = From;
    callProps.to = To;
  };
  const rpt = {
    sid,
    accountSid,
    appName: friendlyName,
    appVersion: version,
    startTime: dateCreated,
    endTime: dateUpdated,
    ...callProps,
    stepRpts: stepRpts
  };
  customFlds.forEach(fld => {
    rpt[fld.name] = fld.value;
  });
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