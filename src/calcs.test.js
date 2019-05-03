const {valueAggregator} = require('./calcs');

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
