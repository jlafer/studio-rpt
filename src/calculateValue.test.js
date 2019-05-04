const R = require('ramda');
const {calculateValue} = require('./calcs');
const {addWhereFn} = require('./config');

const sid = 'FNxxxx';
const stepTable = {
  sid: sid,
  startTimeMSec: 10000,
  prevTimeMSec: 0,
  rows: [
    {
      'step.sid': sid,
      'step.name': 'Trigger',
      'step.idx': 0,
      'trigger.var1': 'val1',
      'trigger.var2': 'val2',
      'step.result': 'complete'
    },
    {
      'step.sid': sid,
      'step.name': 'aaa',
      'step.idx': 1,
      status_code: 200,
      body: 'some data',
      'step.duration': 0,
      'step.result': 'complete'
    },
    {
      'step.sid': sid,
      'step.name': 'bbb',
      'step.idx': 2,
      'step.duration': 5000,
      'step.result': 'match',
      'Digits': '5'
    },
    {
      'step.sid': sid,
      'step.name': 'ccc',
      'step.idx': 3,
      'step.duration': 4000,
      'step.result': 'match',
      'Digits': '9'
    },
    {
      'step.sid': sid,
      'step.name': 'ddd',
      'step.idx': 4,
      'step.duration': 1000,
      'step.result': 'hangup'
    }
  ]
}

const fieldBase = {
  "name":"language",
  "select":"body",
  "map":"identity",
  "agg":"last",
  "default":"default data"
};
const sumField = {
  "name":"duration",
  "select":"step.duration",
  "map":"identity",
  "agg":"sum",
  "default":0
};

// 'calculateValue' tests
test("calculateValue returns value from one row", () => {
  const field = {...fieldBase, "where":[
    {"step.name":"aaa"}
  ]};
  const fieldWithFn = addWhereFn(field);
  const expected = {...fieldWithFn, value: 'some data'}
  expect(calculateValue(stepTable, fieldWithFn)).toEqual(expected);
});
test("calculateValue returns aggregated value from multiple rows", () => {
  const field = {...sumField, "where":[
    {"Digits":{"not":"null"}}
  ]};
  const fieldWithFn = addWhereFn(field);
  const expected = {...fieldWithFn, value: 9000}
  expect(calculateValue(stepTable, fieldWithFn)).toEqual(expected);
});
