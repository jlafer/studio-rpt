const R = require('ramda');
const {addStepNamespace} = require('./functions');
const {valueNotObject, valueIsObject, valueIsArray, isNotNil, isNotEquals}
= require('../src/temputil');

const stdSummFlds = [
  'sid', 'accountSid', 'appName', 'appVersion', 'startTime', 'endTime',
  'lastStep', 'callSid', 'from', 'to'
];

const stdStepFlds = [
  'sid', 'name', 'idx', 'transitionedTo', 'startTime', 'endTime', 'duration',
  'elapsed', 'result'
];

const kvToOpsPred = (whereOpsObj) => {
  const operatorPairs = R.toPairs(whereOpsObj);
  if (operatorPairs.length == 0)
    return R.T;
  const [operator, operand] = operatorPairs[0];
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

const makeOpsPred = whereOpsObj =>
  R.map(kvToOpsPred, whereOpsObj);

const listToInPred = list => R.flip(R.includes)(list);

const makeInPred = (whereInObj) => R.map(listToInPred, whereInObj);

const makeRowFilterFn = clause => {
  //console.log(`makeRowFilterFn: for clause:`, clause)
  const whereEqObj = R.filter(valueNotObject, clause);
  const whereOpsObj = R.filter(valueIsObject, clause);
  const whereOpsPredObj = makeOpsPred(whereOpsObj);
  const whereInObj = R.filter(valueIsArray, clause);
  const whereInPredObj = makeInPred(whereInObj);
  const filterFn = R.allPass([
    R.whereEq(whereEqObj),
    R.where(whereOpsPredObj),
    R.where(whereInPredObj)
  ]);
  return (row) => {
    //console.log(`filtering row ${row['step.name']}`)
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
  return {
    ...rest,
    fields: fieldsWithFns,
    summHeader,
    dtlHeader,
    dtlHeaderQualified
  };
};

module.exports = {
  fillOutConfig,
  makeSummHeader,
  stdStepFlds,
  stdSummFlds
}