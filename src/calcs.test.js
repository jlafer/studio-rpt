const R = require('ramda');
const {transformExecutionData, valuesAggregator} = require('./calcs');
const {stdSteps, stdFlow, stdCfg, stdExecAndContext} = require('./test-helpers');
const {isoDateToMsec, dtToIsoLocal} = require('jlafer-fnal-util');

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

// valuesAggregator tests
test("valuesAggregator performs sum on empty list", () => {
  expect(valuesAggregator('sum', [])).toEqual(0);
});
test("valuesAggregator performs sum on one value", () => {
  expect(valuesAggregator('sum', [42])).toEqual(42);
});
test("valuesAggregator performs sum on multiple values", () => {
  expect(valuesAggregator('sum', [21, 21])).toEqual(42);
});
test("valuesAggregator performs count on empty list", () => {
  expect(valuesAggregator('count', [])).toEqual(0);
});
test("valuesAggregator performs count on one value", () => {
  expect(valuesAggregator('count', [42])).toEqual(1);
});
test("valuesAggregator performs count on multiple values", () => {
  expect(valuesAggregator('count', [21, 21])).toEqual(2);
});
test("valuesAggregator performs unique on empty list", () => {
  expect(valuesAggregator('unique', [])).toEqual(0);
});
test("valuesAggregator performs unique on one value", () => {
  expect(valuesAggregator('unique', [42])).toEqual(1);
});
test("valuesAggregator performs unique on multiple distinct values", () => {
  expect(valuesAggregator('unique', [21, 42])).toEqual(2);
});
test("valuesAggregator performs unique on duplicate values", () => {
  expect(valuesAggregator('unique', [21, 42, 21])).toEqual(2);
});
test("valuesAggregator performs max on empty list", () => {
  expect(valuesAggregator('max', [])).toEqual(0);
});
test("valuesAggregator performs max on one value", () => {
  expect(valuesAggregator('max', [42])).toEqual(42);
});
test("valuesAggregator performs max on multiple values", () => {
  expect(valuesAggregator('max', [42, 21])).toEqual(42);
});
test("valuesAggregator performs first on empty list", () => {
  expect(valuesAggregator('first', [])).toEqual(undefined);
});
test("valuesAggregator performs first on one value", () => {
  expect(valuesAggregator('first', [42])).toEqual(42);
});
test("valuesAggregator performs first on multiple values", () => {
  expect(valuesAggregator('first', [42, 21])).toEqual(42);
});
test("valuesAggregator performs last on empty list", () => {
  expect(valuesAggregator('last', [])).toEqual(undefined);
});
test("valuesAggregator performs last on one value", () => {
  expect(valuesAggregator('last', [42])).toEqual(42);
});
test("valuesAggregator performs last on multiple values", () => {
  expect(valuesAggregator('last', [42, 0, 21])).toEqual(21);
});
test("valuesAggregator performs exists on empty list", () => {
  expect(valuesAggregator('exists', [])).toEqual(false);
});
test("valuesAggregator performs exists on one value", () => {
  expect(valuesAggregator('exists', [42])).toEqual(true);
});
test("valuesAggregator performs exists on multiple values", () => {
  expect(valuesAggregator('exists', [42, 21, 0])).toEqual(true);
});
test("valuesAggregator performs path on empty list", () => {
  expect(valuesAggregator('path', [])).toEqual('');
});
test("valuesAggregator performs path on one value", () => {
  expect(valuesAggregator('path', ['aaa'])).toEqual('aaa');
});
test("valuesAggregator performs path on multiple values", () => {
  expect(valuesAggregator('path', ['aaa', 'bbb', 'ccc'])).toEqual('aaa__bbb__ccc');
});
