const R = require('ramda');
const {calculateValue} = require('./calcs');
const {addWhereFn} = require('./config');
const {stdStepTable} = require('./test-helpers');

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
  expect(calculateValue(stdStepTable, fieldWithFn)).toEqual(expected);
});
test("calculateValue returns aggregated value from multiple rows", () => {
  const field = {...sumField, "where":[
    {"Digits":{"not":"null"}}
  ]};
  const fieldWithFn = addWhereFn(field);
  const expected = {...fieldWithFn, value: 9000}
  expect(calculateValue(stdStepTable, fieldWithFn)).toEqual(expected);
});
