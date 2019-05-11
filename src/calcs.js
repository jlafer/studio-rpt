const R = require('ramda');
const {addStepNamespaceToVars, getFlowVars, qualifyFlowVars, qualifyTriggerVars}
= require('./functions');
const {pickNamesAndValues, isoDateToMsec, dtToIsoLocal} = require('./temputil');
const {addWhereFn} = require('./config');

const keyStartsWithStep = (_v, k) => R.test(/^step./, k);

const rowToStepRptRcd = row => R.pickBy(keyStartsWithStep, row);

const rowFilter = R.curry((field, row) => field.fieldWhereFn(row));

const dataGetter = R.curry((dataSpec, row) => {
  if (typeof dataSpec === 'string')
    return R.prop(dataSpec, row);
  if (Array.isArray(dataSpec))
    return R.path(dataSpec, row);
  if (typeof dataSpec === 'number')
    return dataSpec;
  console.log(`${dataSpec} is an unsupported data spec!`);
  return 0;
});

const dataToValueMapper = R.curry((map, defaultValue, value) => {
  const result = value || defaultValue;
  if (map === 'identity')
    return result;
  console.log(`${map} is an unsupported value map function!`);
  return result;
});

const joinIfNotNull = R.curry((separator, first, second) => {
  if (first && second)
    return `${first}${separator}${second}`;
  else if (first)
    return first;
  else
    return second;
});

const exists = (first, second) => (!!first || !!second);

const aggFnMap = {
  sum: R.add,
  count: R.inc,
  max: Math.max,
  last: R.defaultTo,
  first: R.flip(R.defaultTo),
  exists,
  path: joinIfNotNull('__')
};

const valueAggregator = R.curry((agg, accum, value) => {
  const aggFn = aggFnMap[agg];
  return aggFn(accum, value)
});

const calculateValue = R.curry((stepTable, field) => {
  const {rows} = stepTable;
  //console.log('calculateValue: for field:', field);
  const value = rows.filter(rowFilter(field))
    .map(dataGetter(field.select))
    .map(dataToValueMapper(field.map, field.default))
    .reduce(valueAggregator(field.agg), null);
  //console.log('calculateValue: value:', value);
  return {...field, value: (value || field.default)};
});

const logTable = (table) => {
  table.rows.forEach(row => {console.log('row:', row);});
};

const isHttpCall = R.allPass([R.has('status_code'), R.has('content_type')]);
const isConnectCall = R.allPass([R.has('DialCallStatus'), R.has('DialCallSid')]);
const isSendToFlex = R.allPass([R.has('QueueResult'), R.has('QueueSid')]);
const isGatherInput = R.anyPass([R.has('Digits'), R.has('SpeechResult')]);

const makeStepClass = (widgetVars, flowVars, idx, result, duration) => {
  if (idx == 0)
    return 'Trigger';
  if (isHttpCall(widgetVars))
    return 'HttpCall';
  if (isConnectCall(widgetVars))
    return 'ConnectCallTo';
  if (isGatherInput(widgetVars))
    return 'GatherInput';
  if (isSendToFlex(widgetVars))
    return 'SendToFlex';
  if (result === 'audioComplete')
    return 'SayOrPlay';
  if (['match','noMatch'].includes(result))
    return 'SplitOn';
  if (R.whereEq(widgetVars, flowVars))
    return 'SetVariables';
};

const addRowToTable = (accum, stepAndContext, idx) => {
  const {sid, startTimeMSec, prevTimeMSec, rows} = accum;
  const {step, context: stepContext} = stepAndContext;
  const {
    transitionedFrom: name, transitionedTo, name: result,
    dateCreated: endTimeGMT      // Studio "creates" the step when it ends execution
  } = step;
  const widgetVars = R.pathOr(
    {},
    ['context', 'widgets', name],
    stepContext
  );
  const startDt = new Date();
  startDt.setTime(prevTimeMSec);
  const startTime = dtToIsoLocal(startDt);
  const endTime = dtToIsoLocal(endTimeGMT);
  const endTimeMSec = isoDateToMsec(endTime);
  const duration = endTimeMSec - prevTimeMSec;
  const stepClass = makeStepClass(widgetVars, getFlowVars(stepContext), idx, result, duration);
  const elapsed = endTimeMSec - startTimeMSec;
  const _stepVars = {
    name, idx, stepClass, transitionedTo, startTime, endTime, duration,
    elapsed, result
  };
  const triggerVars = (idx == 0)
    ? qualifyTriggerVars(stepContext)
    : {};
  const flowVars = qualifyFlowVars(stepContext);
  const stepVars = addStepNamespaceToVars(_stepVars);

  const row = {
    'step.sid': sid,
    ...stepVars,
    ...widgetVars,
    ...flowVars,
    ...triggerVars
  };

  return {
    sid,
    startTimeMSec,
    prevTimeMSec: endTimeMSec,
    duration: elapsed,
    stepCnt: idx,   // don't count the trigger "widget"
    rows: [...rows, row]};
};

const makeStepTable = (execAndContext, steps) => {
  const {execution} = execAndContext;
  const {dateCreated} = execution;
  const startTimeMSec = isoDateToMsec(dateCreated);
  const accum = {
    sid: execution.sid, startTimeMSec, prevTimeMSec: startTimeMSec,
    duration: 0, rows: []
  };
  const table = R.reverse(steps).reduce(addRowToTable, accum);
  return table;
};

const makeFilePath = (outDir, fromDt, toDt, type, flow) => {
  return `${outDir}/${flow.sid}_${flow.version}_${type}_${fromDt}_${toDt}.csv`;
};

const wasRouted = (stepTable) => {
  const metricFld = {
    "where":[{"step.stepClass":"SendToFlex"}],
    "select":1,
    "map":"identity",
    "agg":"exists",
    "default":false
  };
  const fldWithFunction = addWhereFn(metricFld);
  const fldWithValue = calculateValue(stepTable, fldWithFunction);
  return fldWithValue.value;
};

const wasReleasedByUser = (stepTable) => {
  const metricFld = {
    "where":[{"step.stepClass":"SayOrPlay", "CallStatus": 'completed'}],
    "select":1,
    "map":"identity",
    "agg":"exists",
    "default":false
  };
  const fldWithFunction = addWhereFn(metricFld);
  const fldWithValue = calculateValue(stepTable, fldWithFunction);
  return fldWithValue.value;
};

const transformExecutionData = (flow, cfg, execAndContext, steps) => {
  const {friendlyName, version} = flow;
  const {execution, context} = execAndContext;
  const {sid, accountSid, dateCreated} = execution;
  console.log(`transformExecutionData: sid: ${sid}`);
  const stepTable = makeStepTable(execAndContext, steps);
  //logTable(stepTable);
  const lastRow = R.last(stepTable.rows);
  const lastStep = lastRow['step.name'];
  const result = lastRow['step.result'];
  const endMethod = wasRouted(stepTable) ? 'redirect' : 'hangup';
  const endBy = wasReleasedByUser(stepTable)
    ? 'user' : (lastRow['flow.endBy'] || 'unknown');
  const endReason = lastRow['flow.endReason'] || 'unknown';
  const startTime = dtToIsoLocal(dateCreated);
  const endTime = lastRow['step.endTime'];
  const customFlds = cfg.fields.map(calculateValue(stepTable));
  const call = context.context.trigger.call;
  const callProps = {};
  if (call) {
    const {CallSid, From, To} = call;
    callProps.callSid = CallSid;
    callProps.from = From;
    callProps.to = To;
  };
  const stepRpts = stepTable.rows.map(rowToStepRptRcd);
  const customValues = pickNamesAndValues(customFlds);
  return {
    sid, accountSid, appName: friendlyName, appVersion: version,
    startTime, endTime, duration: stepTable.duration,
    lastStep, result, endMethod, endBy, endReason,
    ...callProps,
    ...customValues,
    stepRpts
  };
};

module.exports = {
  calculateValue,
  dataGetter,
  dataToValueMapper,
  logTable,
  makeFilePath,
  makeStepTable,
  rowToStepRptRcd,
  transformExecutionData,
  valueAggregator,
  rowFilter
};
