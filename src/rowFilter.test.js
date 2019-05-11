const R = require('ramda');
const {rowFilter} = require('./calcs');
const {addWhereFn} = require('./config');

const fieldBase = {
  "name":"language",
  "select":"flow.language",
  "map":"identity",
  "agg":"last",
  "dlft":"English"
};

const row = {
  'step.name': 'aaa',
  'step.idx': 1,
  status_code: 200,
  'step.duration': 5000,
  'step.result': 'hangup'
};

// 'rowFilter' row filter function tests
test("rowFilter returns true when a 'true' function is specified because none configured", () => {
  const field = {...fieldBase};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(true);
});
test("rowFilter returns true when an equality clause passes", () => {
  const field = {...fieldBase, "where":[
    {"step.name":"aaa"}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(true);
});
test("rowFilter returns false when an equality clause fails", () => {
  const field = {...fieldBase, "where":[
    {"step.name":"bbb"}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(false);
});
test("rowFilter returns false when an equality clause fails on null", () => {
  const field = {...fieldBase, "where":[
    {"missing_var":"foo"}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(false);
});
test("rowFilter returns true when all properties of an equality clause pass", () => {
  const field = {...fieldBase, "where":[
    {"step.name":"aaa", "step.result":"hangup"}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(true);
});
test("rowFilter returns false when one property of an equality clause fails", () => {
  const field = {...fieldBase, "where":[
    {"step.name":"bbb", "step.result":"complete"}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(false);
});
test("rowFilter returns false when one property of an equality clause fails on null", () => {
  const field = {...fieldBase, "where":[
    {"step.name":"aaa", "missing_var":"foo"}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(false);
});
test("rowFilter returns false when all properties of an equality clause fail", () => {
  const field = {...fieldBase, "where":[
    {"step.name":"bbb", "step.result":"complete"}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(false);
});
test("rowFilter returns true when an 'in' clause passes", () => {
  const field = {...fieldBase, "where":[
    {"step.name":["aaa","bbb"]}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(true);
});
test("rowFilter returns false when an 'in' clause fails", () => {
  const field = {...fieldBase, "where":[
    {"step.name":["ccc","bbb"]}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(false);
});
test("rowFilter returns true when a 'not null' clause passes", () => {
  const field = {...fieldBase, "where":[
    {"status_code":{"not":"null"}}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(true);
});
test("rowFilter returns false when a 'not null' clause fails", () => {
  const field = {...fieldBase, "where":[
    {"missing_var":{"not":"null"}}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(false);
});
test("rowFilter returns true when a 'gt' clause passes", () => {
  const field = {...fieldBase, "where":[
    {"step.duration":{"gt":4000}}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(true);
});
test("rowFilter returns true when 'gt' and 'lt' clauses pass", () => {
  const field = {...fieldBase, "where":[
    {"step.duration":{"gt":4000,"lt":5001}}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(true);
});
test("rowFilter returns false when 'gt' and 'lt' clauses fail", () => {
  const field = {...fieldBase, "where":[
    {"step.duration":{"gt":4000,"lt":4999}}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(false);
});
test("rowFilter returns false when a 'gt' clause fails on equal", () => {
  const field = {...fieldBase, "where":[
    {"step.duration":{"gt":5000}}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(false);
});
test("rowFilter returns false when a 'gt' clause fails on less-than", () => {
  const field = {...fieldBase, "where":[
    {"step.duration":{"gt":6000}}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(false);
});
test("rowFilter returns true when a 'lt' clause passes", () => {
  const field = {...fieldBase, "where":[
    {"step.duration":{"lt":6000}}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(true);
});
test("rowFilter returns false when a 'lt' clause fails on equal", () => {
  const field = {...fieldBase, "where":[
    {"step.duration":{"lt":5000}}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(false);
});
test("rowFilter returns false when a 'lt' clause fails on more-than", () => {
  const field = {...fieldBase, "where":[
    {"step.duration":{"lt":4000}}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(false);
});
test("rowFilter returns true when two equality clauses pass", () => {
  const field = {...fieldBase, "where":[
    {"step.name":"aaa"},
    {"step.result":"hangup"}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(true);
});
test("rowFilter returns true when one of two equality clauses passes", () => {
  const field = {...fieldBase, "where":[
    {"step.name":"aaa"},
    {"step.result":"complete"}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(true);
});
test("rowFilter returns false when none of two equality clauses passes", () => {
  const field = {...fieldBase, "where":[
    {"step.name":"bbb"},
    {"step.result":"complete"}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(false);
});
test("rowFilter returns true when two different clause types pass", () => {
  const field = {...fieldBase, "where":[
    {"step.name":"aaa"},
    {"step.duration":{"lt":6000}}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(true);
});
test("rowFilter returns true when one of two different clause types passes", () => {
  const field = {...fieldBase, "where":[
    {"step.name":"aaa"},
    {"step.duration":{"lt":4000}}
  ]};
  const fieldWithFn = addWhereFn(field);
  expect(rowFilter(fieldWithFn, row)).toEqual(true);
});
