/*
  This module supports the 'report' command of the 'studiorpt' CLI program.

  TODO
  - move utility functions out
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

const writeData = (execRpts, cfg, summStream, stepStream) => {
  execRpts.forEach(execRpt => {
    let summText = cfg.summRcdToDelimitedString(execRpt);
    writeToStream(summStream, summText);
    if (stepStream) {
      let dtlRcds = execRpt.stepRpts.map(cfg.stepRcdToDelimitedString);
      writeRcdsToStream(stepStream, dtlRcds);
    }
  });
};

module.exports = async (args) => {
  const {acct, auth, detail, flowSid, fromDt, toDt, cfgPath, outDir} = args;
  let dtlPath, stepStream;
  try {
    const spinner = ora().start();
    const client = require('twilio')(acct, auth);
    const flow = await helpers.getWorkflow(client, flowSid);
    const rawCfg = await readJsonFile(cfgPath);
    const cfg = fillOutConfig(stdSummFlds, stdStepFlds, rawCfg);
    const summPath = makeFilePath(outDir, fromDt, toDt, 'summary', flow);
    const summStream = openStream(summPath);
    writeToStream(summStream, cfg.summHeader.join(cfg.delimiter)+'\n');
    if (detail) {
      dtlPath = makeFilePath(outDir, fromDt, toDt, 'detail', flow);
      stepStream = openStream(dtlPath);
      writeToStream(stepStream, cfg.dtlHeader.join(cfg.delimiter)+'\n');
    }
    const firstPage = await helpers.getExecutionsPage(
      client, flowSid, {dateCreatedFrom: fromDt, dateCreatedTo: toDt, pageSize: 10}
    );
    let {nextPageUrl, execContexts} = firstPage;
    const firstPageData = await Promise.all(
      execContexts.map(calculateExecutionData(client, flow, cfg))
    )
    writeData(firstPageData, cfg, summStream, stepStream);
    while (nextPageUrl) {
      let nextPage = await helpers.getExecutionsPage(client, flowSid, nextPageUrl);
      execContexts = nextPage.execContexts;
      let nextPageData = await Promise.all(
        execContexts.map(calculateExecutionData(client, flow, cfg))
      )
      writeData(nextPageData, cfg, summStream, stepStream);
      nextPageUrl = nextPage.nextPageUrl;
    }
    spinner.stop();
    closeStream(summStream);
    if (detail)
      closeStream(stepStream);
  }
  catch(err) {
    spinner.stop();
    console.log('error:', err)
    error(`${err}`);
  };
};