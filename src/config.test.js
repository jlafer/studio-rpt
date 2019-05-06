const R = require('ramda');
const {makeSummHeader, fillOutConfig} = require('./config');
const {stdSummFlds, stdStepFlds, stdRawCfg} = require('./test-helpers');

//TODO
// - add cases for setting default values when not configured by user

// fillOutConfig tests
test("fillOutConfig adds all fields", () => {
  const actual = fillOutConfig(stdSummFlds, stdStepFlds, stdRawCfg);
  expect(actual.delimiter).toEqual(',');
  expect(actual.batchSize).toEqual(50);
  expect(actual.summHeader).toEqual(R.concat(stdSummFlds, ['aa', 'bb']));
  expect(actual.dtlHeader).toEqual(stdStepFlds);
  expect(actual.dtlHeaderQualified).toEqual(['step.d', 'step.e', 'step.f']);
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
