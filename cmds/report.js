/*
  This module supports the 'report' command of the 'studiorpt' CLI program.

  TODO
  - move utility functions out
  - make detail report optional
  - allow for specifying batch size within time interval
  - create fnal util package
*/

const ora = require('ora');
const R = require('ramda');
const helpers = require('@jlafer/twilio-helpers');
const {readJsonFile} = require('jlafer-node-util');
const error = require('../src/error');
const {makeFilePath, transformExecutionData} = require('../src/calcs');
const {log, openStream, writeRcdsToStream, writeToStream, closeStream}
= require('../src/temputil');
const {fillOutConfig, stdStepFlds, stdSummFlds} = require('../src/config');

const calculateExecutionData = R.curry(
    async (client, flow, cfgWithFns, execAndContext) =>
{
  const steps = await helpers.getSteps(
    client, flow.sid, execAndContext.execution.sid
  );
  return transformExecutionData(flow, cfgWithFns, execAndContext, steps);
});

module.exports = async (args) => {
  const {acct, auth, flowSid, fromDt, toDt, cfgPath, outDir} = args;
  const spinner = ora().start();
  const client = require('twilio')(acct, auth);
  const flow = await helpers.getWorkflow(client, flowSid);
  const rawCfg = await readJsonFile(cfgPath);
  const cfg = fillOutConfig(stdSummFlds, stdStepFlds, rawCfg);
  const summPath = makeFilePath(outDir, fromDt, toDt, 'summary', flow);
  const summStream = openStream(summPath);
  const dtlPath = makeFilePath(outDir, fromDt, toDt, 'detail', flow);
  const stepStream = openStream(dtlPath);
  writeToStream(summStream, cfg.summHeader.join(cfg.delimiter)+'\n');
  writeToStream(stepStream, cfg.dtlHeader.join(cfg.delimiter)+'\n');
  helpers.getExecutions(client, flowSid, fromDt, toDt)
  .then(execs => Promise.all(
    execs.map(calculateExecutionData(client, flow, cfg))
  ))
  .then((execRpts) => {
    spinner.stop();
    execRpts.forEach(execRpt => {
      let summText = cfg.summRcdToDelimitedString(execRpt);
      let dtlRcds = execRpt.stepRpts.map(cfg.stepRcdToDelimitedString);
      writeToStream(summStream, summText);
      writeRcdsToStream(stepStream, dtlRcds);
    });
  })
  .then(() => {
    closeStream(summStream);
    closeStream(stepStream);
  })
  .catch(err => {
    spinner.stop();
    console.log('error:', err)
    error(`${err}`);
  });
};