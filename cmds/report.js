/*
  This module supports the 'report' command of the 'studiorpt' CLI program.
*/
const ora = require('ora');
const error = require('../src/error');
const helpers = require('@jlafer/twilio-helpers');
const {readJsonFile} = require('jlafer-node-util');
const {makeMapFirstOfPairFn, mapKeysOfObject} = require('../src/temputil');
const R = require('ramda');

const log = x => console.log('tap value:', x);

const appendItem = R.curry((list, item) => [...list, item]);

// getWidgetPath :: stepAndContext -> [path]
const getWidgetPath = R.pipe(
  R.path(['step', 'transitionedFrom']),
  appendItem(['context', 'widgets'])
);

const getWidgetDataFromContext = (path, stepContext) => {
  //console.log(`getWidgetDataFromContext: path:`, path);
  //console.log(`getWidgetDataFromContext: stepContext:`, stepContext);
  return R.pathOr({}, path, stepContext);
}

// getWidgetVariableData :: stepAndContext -> widgetData
const getWidgetVariableData = R.converge(
  getWidgetDataFromContext,
  [getWidgetPath, R.prop('context')]
);

const clauseMatchesRow = R.flip(R.whereEq);

const where = R.curry((whereClauses, row) => {
  if (!whereClauses || !whereClauses.length)
    return true;
  //const clauseMatchesRow = R.flip(R.whereEq)(row);
  return R.any(clauseMatchesRow(row), whereClauses);
});

const dataGetter = R.curry((dataSpec, row) => {
  if (Array.isArray(dataSpec)) {
    //console.log(`dataGetter: context`, stepContext);
    //console.log(`dataGetter: returning ${R.path(dataSpec, stepContext)}`);
    return R.path(dataSpec, row);
  }
  if (typeof dataSpec === 'string')
    return R.prop(dataSpec, row);
  if (typeof dataSpec === 'number' && dataSpec == 1)
    return 1;
  console.log(`dataGetter: ${dataSpec} is an unsupported data spec!`);
  return 0;
});

const dataToValueMapper = R.curry((map, defaultValue, value) => {
  const result = value || defaultValue;
  if (map === 'identity')
    return result;
  console.log(`dataToValueMapper: ${map} is an unsupported value map function!`);
  return result;
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
    case 'count':
      return (result + 1);
    case 'max':
      return Math.max(result, value);
    case 'first':
      return result || value;
    case 'last':
      return value;
    case 'path':
      return `${result}:${value}`;
    default:
      console.log(`valueAggregator: ${agg} is an unsupported agg function!`);
      return value;
  }
});

const calculateValue = R.curry((stepTable, field) => {
  const {rows} = stepTable;
  //console.log('calculateValue: for field:', field);
  const value = rows.filter(where(field.where))
    .map(dataGetter(field.select))
    .map(dataToValueMapper(field.map, field.default))
    .reduce(valueAggregator(field.agg), null);
  //console.log('calculateValue: value:', value);
  return {...field, value: (value || field.default)};
});

const logTable = (table) => {
  table.rows.forEach(row => {
    console.log('row:', row);
  });
};

const addRowToTable = R.curry((accum, stepAndContext, idx) => {
  const {startTimeMSec, prevTimeMSec, rows} = accum;
  const {step, context: stepContext} = stepAndContext;
  const {
    transitionedFrom: name, transitionedTo, name: result,
    dateCreated: endTime
  } = step;
  const endDt = new Date(endTime);
  const endTimeMSec = endDt.getTime();
  const duration = endTimeMSec - prevTimeMSec;
  const elapsed = endTimeMSec - startTimeMSec;
  const startDt = new Date();
  startDt.setTime(prevTimeMSec);
  const startTime = startDt.toISOString();
  const widgetVars = R.pathOr(
    {},
    ['context', 'widgets', name],
    stepContext
  );

  const _stepVars = {
    name,
    idx,
    transitionedTo,
    startTime,
    endTime,
    duration,
    elapsed,
    result
  };

  const addFlowNamespace = R.concat('flow.');
  const addFlowNamespaceToFirst = makeMapFirstOfPairFn(addFlowNamespace);
  const addFlowNamespaceToVars = mapKeysOfObject(addFlowNamespaceToFirst);
  const getFlowVars = R.pathOr({}, ['context', 'flow', 'variables']);
  // namespaceFlowVars :: context -> obj
  const namespaceFlowVars = R.pipe(
    getFlowVars, addFlowNamespaceToVars
  );
  const flowVars = namespaceFlowVars(stepContext);

  const addStepNamespace = R.concat('step.');
  const addStepNamespaceToFirst = makeMapFirstOfPairFn(addStepNamespace);
  const addStepNamespaceToVars = mapKeysOfObject(addStepNamespaceToFirst);
  const stepVars = addStepNamespaceToVars(_stepVars);

  const row = {
    ...stepVars,
    ...widgetVars,
    ...flowVars
  };
  return {
    startTimeMSec,
    prevTimeMSec: endTimeMSec,
    stepCnt: idx,   // don't count the trigger "widget"
    rows: [...rows, row]};
});

const makeStepTable = (execAndContext, steps) => {
  const {execution} = execAndContext;
  const {dateCreated} = execution;
  const startDt = new Date(dateCreated);
  const startTimeMSec = startDt.getTime();
  const accum = {startTimeMSec, prevTimeMSec: startTimeMSec, rows: []};
  const table = R.reverse(steps).reduce(addRowToTable(), accum);
  return table;
};

const keyStartsWithStep = (_v, k) => R.test(/^step./, k);
const reportRow = row => R.pickBy(keyStartsWithStep, row);

const reportExecution = R.curry( async (client, flow, cfg, execAndContext) => {
  const {friendlyName, version} = flow;
  const {execution, context} = execAndContext;
  const {sid, accountSid, dateCreated, dateUpdated} = execution;
  const steps = await helpers.getSteps(client, flow.sid, execution.sid);
  const stepTable = makeStepTable(execAndContext, steps);
  //logTable(stepTable);
  const stepRpts = stepTable.rows.map(reportRow);
  const lastStep = R.last(stepRpts)['step.name'];
  const customFlds = cfg.fields.map(calculateValue(stepTable));
  const call = context.context.trigger.call;
  const callProps = {};
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
    lastStep,
    ...callProps,
    stepRpts
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