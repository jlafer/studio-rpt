/*
  This module supports the 'report' command of the 'studiorpt' CLI program.

  TODO
  - debug: batchSize > records returned causes ECONNRESET error
  - test and profile: messaging, make outgoing call,
    record voicemail, enqueue, capture payment
  - add inference of widget class for the above classes
  - add raw value to step report (based on widget class)
  - configure unique menu count once widget class support done
  - add support for digital flows
  - add support for other value mapping functions

  TEST CASES NEEDED
  - widgetClass
  - more for: endMethod, endInitiator, endReason
*/

const ora = require('ora');
const R = require('ramda');
const helpers = require('@jlafer/twilio-helpers');
const {readJsonFile, openStream, writeRcdsToStream, writeToStream, closeStream}
= require('jlafer-node-util');
const error = require('../src/error');
const {makeFilePath, transformExecutionData} = require('../src/calcs');
const {log} = require('jlafer-fnal-util');
const {validateConfig, fillOutConfig} = require('../src/config');

const calculateExecutionData = R.curry(
    async (client, flow, cfgWithFns, execAndContext) =>
{
  //console.log('calculateExecutionData: getting steps');
  const steps = await helpers.getSteps(
    client, flow.sid, execAndContext.execution.sid
  );
  //console.log('calculateExecutionData: got steps');
  const rptData = transformExecutionData(flow, cfgWithFns, execAndContext, steps);
  return rptData;
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
  const rawCfg = await readJsonFile(cfgPath);
  const validationErrors = validateConfig(rawCfg);
  if (validationErrors.length) {
    console.log('ERROR: invalid configuration: ', validationErrors);
    return;
  }
  const cfg = fillOutConfig(rawCfg);
  let dtlPath, stepStream, spinner;
  try {
    spinner = ora().start();
    const client = require('twilio')(acct, auth);
    const flow = await helpers.getWorkflow(client, flowSid);
    const summPath = makeFilePath(outDir, fromDt, toDt, 'summary', flow);
    const summStream = openStream(summPath);
    writeToStream(summStream, cfg.summHeader.join(cfg.delimiter)+'\n');
    if (detail) {
      dtlPath = makeFilePath(outDir, fromDt, toDt, 'detail', flow);
      stepStream = openStream(dtlPath);
      writeToStream(stepStream, cfg.dtlHeader.join(cfg.delimiter)+'\n');
    }
    //console.log('getting page');
    const firstPage = await helpers.getExecutionsPage(
      client, flowSid, {dateCreatedFrom: fromDt, dateCreatedTo: toDt, pageSize: cfg.batchSize}
    );
    //console.log('got page');
    let {nextPageUrl, execContexts} = firstPage;
    const firstPageData = await Promise.all(
      execContexts.map(calculateExecutionData(client, flow, cfg))
    )
    writeData(firstPageData, cfg, summStream, stepStream);
    while (nextPageUrl) {
      //console.log('getting another page');
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