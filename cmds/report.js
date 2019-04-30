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

/*
  where: [<clause>, ...]    // where clauses are ORed together

  clause: {<varName>: <value>, ...}

  select: <varName>

  varName:
    <name>            any widget variable
    || step.<name>    where name is one of: name, idx, transitionedTo,
                        transitionedFrom or <widget variable name>
    || flow.<name>    where name is any flow variable

  map: <function>

  function: identity

  agg: first || last || sum || count || min || max || concat

  default: <any>
*/

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
    case 'last':
      return value;
    default:
      console.log(`valueAggregator: ${agg} is an unsupported agg function!`);
      return value;
  }
});

const calculateValue = R.curry((stepTable, field) => {
  const {rows} = stepTable;
  console.log('calculateValue: for field:', field);
  const value = rows.filter(where(field.where))
    .map(R.tap(log))
    .map(dataGetter(field.select))
    .map(dataToValueMapper(field.map, field.default))
    .reduce(valueAggregator(field.agg), null);
  console.log('calculateValue: value:', value);
  return {...field, value: (value || field.default)};
});

const stepToRpt = R.curry((execution, context, stepAndContext) => {
  const {step, context: stepContext} = stepAndContext;
  //console.log('step:', step);
  //console.log('stepContext:', stepContext);
  const {sid, name, transitionedFrom, transitionedTo, dateCreated} = step;
  return {sid, name, transitionedFrom, transitionedTo, dateCreated};
});

const logTable = (table) => {
  table.rows.forEach(row => {
    console.log('row:', row);
  });
};

const addRowToTable = R.curry((accum, stepAndContext, idx) => {
  const {startTime, prevTime, rows} = accum;
  const {step, context: stepContext} = stepAndContext;
  const {transitionedFrom: name, transitionedTo, dateCreated: endTS} = step;
  const endDt = new Date(endTS);
  const endTime = endDt.getTime();
  const duration = endTime - prevTime;
  const elapsed = endTime - startTime;
  const startDt = new Date();
  startDt.setTime(prevTime);
  const startTS = startDt.toISOString();
  const widgetVars = R.pathOr(
    {},
    ['context', 'widgets', name],
    stepContext
  );

  const _stepVars = {
    name,
    idx,
    transitionedTo,
    startTS,
    endTS,
    duration,
    elapsed
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
    startTime,
    prevTime: endTime,
    stepCnt: idx,   // don't count the trigger "widget"
    rows: [...rows, row]};
});

const makeStepTable = (execAndContext, steps) => {
  const {execution} = execAndContext;
  const {dateCreated} = execution;
  const startDt = new Date(dateCreated);
  const startTime = startDt.getTime();
  const accum = {startTime, prevTime: startTime, rows: []};
  const table = R.reverse(steps).reduce(addRowToTable(), accum);
  return table;
};

const reportExecution = R.curry( async (client, flow, cfg, execAndContext) => {
  const {friendlyName, version} = flow;
  const {execution, context} = execAndContext;
  const {sid, accountSid, dateCreated, dateUpdated} = execution;
  const steps = await helpers.getSteps(client, flow.sid, execution.sid);
  const stepTable = makeStepTable(execAndContext, steps);
  //logTable(stepTable);
  const customFlds = cfg.fields.map(calculateValue(stepTable));
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