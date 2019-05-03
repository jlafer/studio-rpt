const R = require('ramda');
const {addStepNamespaceToVars, qualifyFlowVars, qualifyTriggerVars}
= require('./functions');

const reportRow = row => R.pickBy(keyStartsWithStep, row);

const where = R.curry((field, row) => field.fieldWhereFn(row));

const dataGetter = R.curry((dataSpec, row) => {
  if (Array.isArray(dataSpec))
    return R.path(dataSpec, row);
  if (typeof dataSpec === 'string')
    return R.prop(dataSpec, row);
  if (typeof dataSpec === 'number' && dataSpec == 1)
    return 1;
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

//const ifFirstElseSecond = (first, second) => (first || second);

const aggMapper = {
  sum: R.add,
  count: R.inc,
  max: Math.max,
  last: R.nthArg(2),
  first: R.flip(R.defaultTo),
  path: R.pipe(R.pair, R.join('__'))
};

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

  const aggFn = aggMapper[agg];
  //return aggFn(result, value)
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
      console.log(`${agg} is an unsupported agg function!`);
      return value;
  }
});

const calculateValue = R.curry((stepTable, field) => {
  const {rows} = stepTable;
  //console.log('calculateValue: for field:', field);
  const value = rows.filter(where(field))
    .map(dataGetter(field.select))
    .map(dataToValueMapper(field.map, field.default))
    .reduce(valueAggregator(field.agg), null);
  //console.log('calculateValue: value:', value);
  return {...field, value: (value || field.default)};
});

const logTable = (table) => {
  table.rows.forEach(row => {console.log('row:', row);});
};

const addRowToTable = (accum, stepAndContext, idx) => {
  const {sid, startTimeMSec, prevTimeMSec, rows} = accum;
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
    name, idx, transitionedTo, startTime, endTime, duration, elapsed, result
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
    stepCnt: idx,   // don't count the trigger "widget"
    rows: [...rows, row]};
};

const makeStepTable = (execAndContext, steps) => {
  const {execution} = execAndContext;
  const {dateCreated} = execution;
  const startDt = new Date(dateCreated);
  const startTimeMSec = startDt.getTime();
  const accum = {
    sid: execution.sid, startTimeMSec, prevTimeMSec: startTimeMSec, rows: []
  };
  const table = R.reverse(steps).reduce(addRowToTable, accum);
  return table;
};

const keyStartsWithStep = (_v, k) => R.test(/^step./, k);

const makeSummaryText = (cfg, execRpt) => {
  const propsToDelimitedString = R.pipe(
    R.props(cfg.summHeader),
    R.join(cfg.delimiter),
    s => s + '\n'
  );
  return propsToDelimitedString(execRpt);
};

const makeDetailRcds = (cfg, execRpt) => {
  const propsToDelimitedString = R.pipe(
    R.props(cfg.dtlHeaderQualified),
    R.join(cfg.delimiter),
    s => s + '\n'
  );
  return execRpt.stepRpts.map(propsToDelimitedString);
};

const makeFilePath = (outDir, fromDt, toDt, type, flow) => {
  return `${outDir}/${flow.sid}_${flow.version}_${type}_${fromDt}_${toDt}.csv`;
};

module.exports = {
  calculateValue,
  logTable,
  makeDetailRcds,
  makeFilePath,
  makeStepTable,
  makeSummaryText,
  reportRow
};
