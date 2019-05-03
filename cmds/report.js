/*
  This module supports the 'report' command of the 'studiorpt' CLI program.

  TODO
  - convert switch statements to objects
  - support select of a constant (1)
  - move utility functions out
  - create fnal util package
  - add timezone support for output
*/

const ora = require('ora');
const R = require('ramda');
const helpers = require('@jlafer/twilio-helpers');
const {readJsonFile} = require('jlafer-node-util');
const error = require('../src/error');
const {makeStepTable, logTable, reportRow, calculateValue, makeFilePath,
  makeDetailRcds, makeSummaryText} = require('../src/calcs');
const {log, openStream, writeToStream, closeStream}
= require('../src/temputil');
const {fillOutConfig, stdStepFlds, stdSummFlds} = require('../src/config');

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

const writeDetailRcds = (fd, rcds) => {
  rcds.forEach(rcd => {
    writeToStream(fd, rcd);
  });
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