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
test("dataGetter returns 1 when a 1 is selected", () => {
  expect(dataGetter(1, row)).toEqual(1);
});
test("dataGetter returns constant value when a number is selected", () => {
  expect(dataGetter(42, row)).toEqual(42);
});
