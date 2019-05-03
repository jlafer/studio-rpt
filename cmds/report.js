/*
  This module supports the 'report' command of the 'studiorpt' CLI program.

  TODO
  - convert switch statements to objects
  - support select of a constant (1)
  - move utility functions out
  - create fnal util package
  - add timezone support for output
*/

const fs = require('fs');
const ora = require('ora');
const R = require('ramda');
const helpers = require('@jlafer/twilio-helpers');
const {readJsonFile} = require('jlafer-node-util');
const error = require('../src/error');
const {log, openStream, writeToStream, closeStream}
= require('../src/temputil');
const {fillOutConfig} = require('../src/config');
const {addStepNamespaceToVars, qualifyFlowVars, qualifyTriggerVars}
= require('../src/functions');

const stdSummFlds = [
  'sid', 'accountSid', 'appName', 'appVersion', 'startTime', 'endTime',
  'lastStep', 'callSid', 'from', 'to'
];

const stdStepFlds = [
  'sid', 'name', 'idx', 'transitionedTo', 'startTime', 'endTime', 'duration',
  'elapsed', 'result'
];

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

  const aggFn = aggMapper(agg);
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

const reportRow = row => R.pickBy(keyStartsWithStep, row);

const reportExecution = R.curry(
    async (client, flow, cfgWithFns, execAndContext) =>
{
  const {friendlyName, version} = flow;
  const {execution, context} = execAndContext;
  const {sid, accountSid, dateCreated, dateUpdated} = execution;
  const steps = await helpers.getSteps(client, flow.sid, execution.sid);
  const stepTable = makeStepTable(execAndContext, steps);
  logTable(stepTable);
  const stepRpts = stepTable.rows.map(reportRow);
  const lastStep = R.last(stepRpts)['step.name'];
  const customFlds = cfgWithFns.fields.map(calculateValue(stepTable));
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

const writeDetailRcds = (fd, rcds) => {
  rcds.forEach(rcd => {
    writeToStream(fd, rcd);
  });
};

const makeFilePath = (outDir, fromDt, toDt, type, flow) => {
  return `${outDir}/${flow.sid}_${flow.version}_${type}_${fromDt}_${toDt}.csv`;
};

module.exports = async (args) => {
  const {acct, auth, flowSid, fromDt, toDt, cfgPath, outDir} = args;

  const spinner = ora().start();
  const client = require('twilio')(acct, auth);

  const rawCfg = await readJsonFile(cfgPath);
  const cfg = fillOutConfig(stdSummFlds, stdStepFlds, rawCfg);
  const flow = await helpers.getWorkflow(client, flowSid);
  const summPath = makeFilePath(outDir, fromDt, toDt, 'summary', flow);
  const summFD = openStream(summPath);
  const dtlPath = makeFilePath(outDir, fromDt, toDt, 'detail', flow);
  const dtlFD = openStream(dtlPath);
  writeToStream(summFD, cfg.summHeader.join(cfg.delimiter)+'\n');
  writeToStream(dtlFD, cfg.dtlHeader.join(cfg.delimiter)+'\n');
  helpers.getExecutions(client, flowSid, fromDt, toDt)
  .then(execs =>
    Promise.all(execs.map(reportExecution(client, flow, cfg)))
  )
  .then(async (execRpts) => {
    spinner.stop();
    execRpts.forEach(async execRpt => {
      let summText = makeSummaryText(cfg, execRpt);
      writeToStream(summFD, summText);
      let dtlRcds = makeDetailRcds(cfg, execRpt);
      writeDetailRcds(dtlFD, dtlRcds);
    });
  })
  .then(async () => {
    closeStream(summFD);
    closeStream(dtlFD);
  })
  .catch(err => {
    spinner.stop();
    console.log('error:', err)
    error(`${err}`);
  });
};