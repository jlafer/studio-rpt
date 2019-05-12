const R = require('ramda');
const {validateConfig, stdSummFlds, stdStepFlds, makeSummHeader, fillOutConfig}
= require('./config');
const {stdRawCfg} = require('./test-helpers');

//TODO
// - add cases for setting default values when not configured by user

// validateConfig tests
test("validateConfig catches errors", () => {
  const errorCfg = {
    delimiter: 'foo',
    batchSize: 'foo',
    fields: [
      {map: 'identity', agg: 'sum'},
      {name: 'a', map: 'badmap', agg: 'badagg'}
    ]
  }
  const actual = validateConfig(errorCfg);
  expect(actual.length).toEqual(5);
});
test("validateConfig passes clean config", () => {
  const errorCfg = {
    delimiter: ',',
    batchSize: 42,
    fields: [
      {name: 'a', map: 'identity', agg: 'sum'},
      {name: 'b', agg: 'sum'}
    ]
  }
  const actual = validateConfig(errorCfg);
  expect(actual.length).toEqual(0);
});

// fillOutConfig tests
test("fillOutConfig adds all fields", () => {
  const actual = fillOutConfig(stdRawCfg);
  expect(actual.delimiter).toEqual(',');
  expect(actual.batchSize).toEqual(50);
  expect(actual.summHeader).toEqual(R.concat(stdSummFlds, ['aa', 'bb']));
  expect(actual.dtlHeader).toEqual(stdStepFlds);
  expect(actual.dtlHeaderQualified).toHaveLength(stdStepFlds.length);
  expect(actual.fields).toHaveLength(2);
  expect(actual.fields[0].fieldWhereFn).toBeInstanceOf(Function);
  expect(actual.fields[1].fieldWhereFn).toBeInstanceOf(Function);
});

// makeSummHeader tests
test("makeSummHeader adds all custom fields", () => {
  const fields = [
    {name: 'd', foo: 'bar'},
    {name: 'e', foo: 'bar'},
  ]
  expect(makeSummHeader(['a', 'b', 'c'], fields)).toEqual(['a', 'b', 'c', 'd', 'e']);
});
test("makeSummHeader adds no custom fields", () => {
  const fields = [];
  expect(makeSummHeader(['a', 'b', 'c'], fields)).toEqual(['a', 'b', 'c']);
});
