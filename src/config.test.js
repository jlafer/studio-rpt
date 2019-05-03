const {makeSummHeader} = require('./config');

// makeSummHeader tests
test("makeSummHeader adds all fields", () => {
  const fields = [
    {name: 'd', foo: 'bar'},
    {name: 'e', foo: 'bar'},
  ]
  expect(makeSummHeader(['a', 'b', 'c'], fields)).toEqual(['a', 'b', 'c', 'd', 'e']);
});
test("makeSummHeader adds no fields", () => {
  const fields = [];
  expect(makeSummHeader(['a', 'b', 'c'], fields)).toEqual(['a', 'b', 'c']);
});
