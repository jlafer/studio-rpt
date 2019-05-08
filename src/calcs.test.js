const R = require('ramda');
const {transformExecutionData, valueAggregator} = require('./calcs');
const {stdSteps, stdFlow, stdCfg, stdExecAndContext} = require('./test-helpers');
const {isoDateToMsec} = require('./temputil');

// transformExecutionData tests
test("transformExecutionData performs", () => {
  const actual = transformExecutionData(stdFlow, stdCfg, stdExecAndContext, stdSteps);
  const {sid, accountSid, dateCreated} = stdExecAndContext.execution;
  const dateEnded = R.head(stdSteps).step.dateCreated; // steps are in reverse chronological
  
  expect(actual.sid).toEqual(sid);
  expect(actual.accountSid).toEqual(accountSid);
  expect(actual.callSid).toEqual('CAxxxx');
  expect(actual.startTime).toEqual(dateCreated);
  expect(actual.endTime).toEqual(dateEnded);
  expect(actual.duration).toEqual(isoDateToMsec(dateEnded) - isoDateToMsec(dateCreated));
  expect(actual.from).toEqual('+12088747271');
  expect(actual.to).toEqual('+15551112222');
  expect(actual.aa).toEqual(11000);
  expect(actual.bb).toEqual(1);
  expect(actual.lastStep).toEqual('ddd');
  expect(actual.stepRpts).toHaveLength(5);
  expect(actual.stepRpts[0]['step.idx']).toEqual(0);
  expect(actual.stepRpts[0]['step.name']).toEqual('Trigger');
  const step4 = actual.stepRpts[4];
  expect(step4['step.idx']).toEqual(4);
  expect(step4['step.name']).toEqual('ddd');
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
test("valueAggregator performs path when accum is null", () => {
  expect(valueAggregator('path', null, 'aaa')).toEqual('aaa');
});
test("valueAggregator performs path when accum is not null", () => {
  expect(valueAggregator('path', 'aaa', 'bbb')).toEqual('aaa__bbb');
});
test("valueAggregator performs path when accum has multiple nodes", () => {
  expect(valueAggregator('path', 'aaa__bbb', 'ccc')).toEqual('aaa__bbb__ccc');
});
