const R = require('ramda');
const {transformExecutionData, valueAggregator} = require('./calcs');
const {stdSteps, stdFlow, stdCfg, stdExecAndContext} = require('./test-helpers');
const {isoDateToMsec, dtToIsoLocal} = require('./temputil');

// transformExecutionData tests
test("transformExecutionData performs", () => {
  const actual = transformExecutionData(stdFlow, stdCfg, stdExecAndContext, stdSteps);
  const {sid, accountSid, dateCreated} = stdExecAndContext.execution;
  const dateEnded = R.head(stdSteps).step.dateCreated; // steps are in reverse chronological
  const startTime = dtToIsoLocal(dateCreated);
  const endTime = dtToIsoLocal(dateEnded);
  expect(actual.sid).toEqual(sid);
  expect(actual.appName).toEqual(stdFlow.friendlyName);
  expect(actual.appVersion).toEqual(stdFlow.version);
  expect(actual.startTime).toEqual(startTime);
  expect(actual.endTime).toEqual(endTime);
  expect(actual.duration).toEqual(isoDateToMsec(dateEnded) - isoDateToMsec(dateCreated));
  expect(actual.lastStep).toEqual('ddd');
  expect(actual.result).toEqual('audioComplete');
  expect(actual.callSid).toEqual('CAxxxx');
  expect(actual.from).toEqual('+12088747271');
  expect(actual.to).toEqual('+15551112222');
  expect(actual.endMethod).toEqual('hangup');
  expect(actual.endBy).toEqual('unknown');
  expect(actual.endReason).toEqual('unknown');
  expect(actual.aa).toEqual(11000);
  expect(actual.bb).toEqual(1);
  expect(actual.stepRpts).toHaveLength(5);
  expect(actual.stepRpts[0]['step.idx']).toEqual(0);
  expect(actual.stepRpts[0]['step.name']).toEqual('Trigger');
  const step4 = actual.stepRpts[4];
  expect(step4['step.idx']).toEqual(4);
  expect(step4['step.name']).toEqual('ddd');
  expect(step4['step.startTime']).toEqual('2019-04-27T18:19:58-07:00');
  expect(step4['step.endTime']).toEqual('2019-04-27T18:19:59-07:00');
  expect(step4['step.duration']).toEqual(1000);
  expect(step4['step.elapsed']).toEqual(11000);
  expect(step4['step.result']).toEqual('audioComplete');
  expect(step4['step.transitionedTo']).toEqual('Ended');
});

// valueAggregator tests
test("valueAggregator performs sum when accum is null", () => {
  expect(valueAggregator('sum', null, 42)).toEqual(42);
});
test("valueAggregator performs sum when accum = 0", () => {
  expect(valueAggregator('sum', 0, 42)).toEqual(42);
});
test("valueAggregator performs sum when accum is non-zero", () => {
  expect(valueAggregator('sum', 21, 21)).toEqual(42);
});
test("valueAggregator performs count when accum is null", () => {
  expect(valueAggregator('count', null, 42)).toEqual(1);
});
test("valueAggregator performs count when accum = 0", () => {
  expect(valueAggregator('count', 0, 42)).toEqual(1);
});
test("valueAggregator performs count when accum is non-zero", () => {
  expect(valueAggregator('count', 41, 21)).toEqual(42);
});
test("valueAggregator performs max when accum is null", () => {
  expect(valueAggregator('max', null, 42)).toEqual(42);
});
test("valueAggregator performs max when accum = 0", () => {
  expect(valueAggregator('max', 0, 42)).toEqual(42);
});
test("valueAggregator performs max when accum is greater than value", () => {
  expect(valueAggregator('max', 42, 21)).toEqual(42);
});
test("valueAggregator performs max when accum is less than value", () => {
  expect(valueAggregator('max', 21, 42)).toEqual(42);
});
test("valueAggregator performs first when accum is null", () => {
  expect(valueAggregator('first', null, 42)).toEqual(42);
});
test("valueAggregator performs first when accum is not null", () => {
  expect(valueAggregator('first', 42, 21)).toEqual(42);
});
test("valueAggregator performs last when accum is null", () => {
  expect(valueAggregator('last', null, 42)).toEqual(42);
});
test("valueAggregator performs last when accum is not null", () => {
  expect(valueAggregator('last', 42, 21)).toEqual(21);
});
test("valueAggregator performs exists when accum is null", () => {
  expect(valueAggregator('exists', null, 42)).toEqual(true);
});
test("valueAggregator performs exists when accum is not null", () => {
  expect(valueAggregator('exists', 42, 21)).toEqual(true);
});
test("valueAggregator 'exists' keeps true when value is null", () => {
  expect(valueAggregator('exists', true, null)).toEqual(true);
});
test("valueAggregator 'exists' keeps false when value is null", () => {
  expect(valueAggregator('exists', false, null)).toEqual(false);
});
test("valueAggregator performs path when accum is null", () => {
  expect(valueAggregator('path', null, 'aaa')).toEqual('aaa');
});
test("valueAggregator performs path when accum is not null", () => {
  expect(valueAggregator('path', 'aaa', 'bbb')).toEqual('aaa__bbb');
});
test("valueAggregator performs path when accum has multiple nodes", () => {
  expect(valueAggregator('path', 'aaa__bbb', 'ccc')).toEqual('aaa__bbb__ccc');
});
