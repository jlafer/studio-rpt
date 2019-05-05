const R = require('ramda');
const {addStepNamespace} = require('./functions');
const {valueNotObject, valueIsObject, valueIsArray, isNotNil, isNotEquals}
= require('../src/temputil');

const stdSummFlds = [
  'sid', 'appName', 'appVersion', 'startTime', 'endTime', 'lastStep',
  'callSid', 'from', 'to'
];

const stdStepFlds = [
  'sid', 'name', 'idx', 'transitionedTo', 'startTime', 'endTime', 'duration',
  'elapsed', 'result'
];

// testToPredicate :: [operator, operand] -> predicate
const testToPredicate = (testPair) => {
  const [operator, operand] = testPair;
  switch (operator) {
    case 'not':
      if (operand === 'null')
        return isNotNil;
      else
        return isNotEquals(operand);
    case 'gt':
      return R.lt(operand);
    case 'lt':
      return R.gt(operand);
    default:
      console.log(`${operator} is an unsupported filter operator!`);
      return R.F;
  }
};

// condToOpsPred :: {op1: operand, ...} -> predicate
const condToOpsPred = (condObj) => {
  const opsPred = R.pipe(
    R.toPairs,
    R.map(testToPredicate),
    R.allPass
  );
  return opsPred(condObj);
};

// makeOpsPred :: {var1: {op1: operand, op2: ...}, var2: ...} -> {var1: predicate, var2: ...}
const makeOpsPredObj = (whereOpsObj) => R.map(condToOpsPred, whereOpsObj);

const listToInPred = (list) => R.flip(R.includes)(list);

const makeInPredObj = (whereInObj) => R.map(listToInPred, whereInObj);

// makeRowFilterFn :: clause -> predicate
const makeRowFilterFn = clause => {
  const whereEqObj = R.filter(valueNotObject, clause);
  const whereOpsObj = R.filter(valueIsObject, clause);
  const whereOpsPredObj = makeOpsPredObj(whereOpsObj);
  const whereInObj = R.filter(valueIsArray, clause);
  const whereInPredObj = makeInPredObj(whereInObj);
  const filterFn = R.allPass([
    R.whereEq(whereEqObj),
    R.where(whereOpsPredObj),
    R.where(whereInPredObj)
  ]);
  return (row) => {
    //console.log(`filtering row `, row);
    return filterFn(row);
  };
}

const getFieldWhereFn = (field) => {
  const whereClauses = field.where;
  if (!whereClauses || !whereClauses.length)
    return R.T;
  const filterFns = R.map(makeRowFilterFn, whereClauses);
  return R.anyPass(filterFns);
};

const addWhereFn = (field) => {
  const fieldWhereFn = getFieldWhereFn(field)
  return {...field, fieldWhereFn}
};

const makeSummHeader = (stdSummFlds, fields) => {
  return [...stdSummFlds, ...fields.map(R.prop('name'))];
};

const fillOutConfig = (stdSummFlds, stdStepFlds, rawCfg) => {
  const {fields, ...rest} = rawCfg;
  const fieldsWithFns = fields.map(addWhereFn);
  const summHeader = makeSummHeader(stdSummFlds, fields);
  const dtlHeader = [...stdStepFlds];
  const dtlHeaderQualified = dtlHeader.map(addStepNamespace);

  // summRcdToDelimitedString :: object -> string
  const summRcdToDelimitedString = R.pipe(
    R.props(summHeader),
    R.join(rawCfg.delimiter),
    s => s + '\n'
  );

  // stepRcdToDelimitedString :: object -> string
  const stepRcdToDelimitedString = R.pipe(
    R.props(dtlHeaderQualified),
    R.join(rawCfg.delimiter),
    s => s + '\n'
  );

  return {
    ...rest,
    fields: fieldsWithFns,
    summHeader,
    dtlHeader,
    dtlHeaderQualified,
    summRcdToDelimitedString,
    stepRcdToDelimitedString
  };
};

module.exports = {
  addWhereFn,
  fillOutConfig,
  makeSummHeader,
  stdStepFlds,
  stdSummFlds
}