const R = require('ramda');
const {calculateValue} = require('./calcs');
const {addWhereFn, setMapFn} = require('./config');
const {stdStepTable} = require('./test-helpers');
const mapFunctions = require('./mapFunctions');

const fieldBase = {
  "name":"language",
  "select":"body",
  "map":"identity",
  "agg":"last",
  "dlft":"default data"
};
const sumField = {
  "name":"duration",
  "select":"step.duration",
  "map":"identity",
  "agg":"sum",
  "dlft":0
};

// 'calculateValue' tests
test("calculateValue returns value from one row", () => {
  const field = {...fieldBase, "where":[
    {"step.name":"aaa"}
  ]};
  const fieldWithFn = addWhereFn(field);
  const fieldWithMap = setMapFn(fieldWithFn);
  const expected = {...fieldWithMap, value: 'some data'}
  expect(calculateValue(stdStepTable, fieldWithMap)).toEqual(expected);
});
test("calculateValue returns aggregated value from multiple rows", () => {
  const field = {...sumField, "where":[
    {"Digits":{"not":"null"}}
  ]};
  const fieldWithFn = addWhereFn(field);
  const fieldWithMap = setMapFn(fieldWithFn);
  const expected = {...fieldWithMap, value: 9000}
  expect(calculateValue(stdStepTable, fieldWithMap)).toEqual(expected);
});
