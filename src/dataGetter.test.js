const {dataGetter, dataToValueMapper} = require('./calcs');

const row = {
  'step.name': 'aaa',
  'step.idx': 1,
  status_code: 200,
  'step.duration': 5000,
  'step.result': 'hangup',
  'flow.language': 'French'
};


// 'dataGetter' tests
test("dataGetter returns value when a 'step' variable is selected", () => {
  expect(dataGetter('step.name', row)).toEqual('aaa');
});
test("dataGetter returns value when a 'widget' variable is selected", () => {
  expect(dataGetter('status_code', row)).toEqual(200);
});
test("dataGetter returns value when a 'flow' variable is selected", () => {
  expect(dataGetter('flow.language', row)).toEqual('French');
});
// 'dataToValueMapper' tests
test("dataToValueMapper returns value when supplied", () => {
  expect(dataToValueMapper('identity', 'default', 'value')).toEqual('value');
});
test("dataToValueMapper returns default value when value NOT supplied", () => {
  expect(dataToValueMapper('identity', 'default', null)).toEqual('default');
});
test("dataToValueMapper returns value when default value NOT supplied", () => {
  expect(dataToValueMapper('identity', null, 'value')).toEqual('value');
});
test("dataToValueMapper returns null when both value and default value NOT supplied", () => {
  expect(dataToValueMapper('identity', null, null)).toEqual(null);
});
test("dataToValueMapper returns undefined when both value and default value are undefined", () => {
  expect(dataToValueMapper('identity', undefined, undefined)).toEqual(undefined);
});