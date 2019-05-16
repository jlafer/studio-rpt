const R = require('ramda');
const {addStepNamespace} = require('./functions');
const {valueNotObject, valueIsObject, valueIsArray, isNotNil, isNotEquals}
= require('jlafer-fnal-util');
const mapFunctions = require('./mapFunctions');

const stdSummFlds = [
  'sid', 'appName', 'appVersion', 'startTime', 'endTime', 'duration', 'lastStep', 'result',
  'callSid', 'from', 'to', 'endMethod', 'endBy', 'endReason'
];

const stdStepFlds = [
  'sid', 'stepClass', 'name', 'idx', 'transitionedTo', 'startTime', 'endTime',
  'duration', 'elapsed', 'result'
];

const validMapValues = ['identity'];
const validAggValues = ['sum', 'count', 'unique', 'first', 'last', 'max', 'exists', 'path'];

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

const addFieldDefaults = (field) => {
  const {name, where, select, map, agg, dflt, ...rest} = field;
  return {...rest,
    name: name,
    where: where || [],
    select: select || name,
    map: map || 'identity',
    agg: agg || 'last',
    dflt: dflt || null
  }
};

const addWhereFn = (field) => {
  const fieldWhereFn = getFieldWhereFn(field)
  return {...field, fieldWhereFn}
};

const setMapFn = (field) => {
  const mapFn = mapFunctions[field.map];
  return {...field, map: mapFn};
};

const makeSummHeader = (stdSummFlds, fields) => {
  return [...stdSummFlds, ...fields.map(R.prop('name'))];
};

// validateField :: (([errors], fld)) -> [errors]
const validateField = (errors, fld) => {
  const fldErrors = [];
  let fldName;
  if (fld.name)
    fldName = fld.name;
  else {
    fldErrors.push(`field has no name`);
    fldName = 'unknown';
  }
  if (fld.where && !Array.isArray(fld.where))
    fldErrors.push(`in ${fldName} "where" must be an array of objects`);
  if (fld.map && !validMapValues.includes(fld.map))
    fldErrors.push(`in ${fldName} "map" must be one of: ${validMapValues}`);
  if (fld.agg && !validAggValues.includes(fld.agg))
    fldErrors.push(`in ${fldName} "agg" must be one of: ${validAggValues}`);
  return [...errors, ...fldErrors];
};

const validateConfig = (cfg) => {
  const {batchSize, delimiter, fields} = cfg;
  const errors = [];
  if (batchSize && isNaN(batchSize))
    errors.push(`"batchSize" must be an integer`);
  if (delimiter && ![',', '\t'].includes(delimiter))
    errors.push(`"delimiter" must be a comma or tab character`);
  return [...errors, ...fields.reduce(validateField, [])];
};

const fillOutConfig = (rawCfg) => {
  const {fields, batchSize, delimiter, ...rest} = rawCfg;
  const _batchSize = batchSize ? batchSize : 100;
  const _delimiter = delimiter ? delimiter : ',';
  const fieldsWithFns = fields
  .map(addFieldDefaults)
  .map(addWhereFn)
  .map(setMapFn);
  const summHeader = makeSummHeader(stdSummFlds, fieldsWithFns);
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
    delimiter: _delimiter,
    batchSize: _batchSize,
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
  setMapFn,
  stdStepFlds,
  stdSummFlds,
  validateConfig
}