const R = require('ramda');

const log = x => console.log('tap value:', x);

// makeMapFirstOfPairFn :: mapFn -> pair -> pair
const makeMapFirstOfPairFn = mapFn =>
  R.converge(
    R.pair,
    [R.pipe(R.head, mapFn), R.last]
  );

// mapKeysOfObject :: mapFirstOfPairFn -> object -> object
const mapKeysOfObject = mapFirstOfPairFn => R.pipe(
  R.toPairs, R.map(mapFirstOfPairFn), R.fromPairs
);

const valueNotObject = value => (typeof value !== 'object');
const valueIsObject = value =>
  (typeof value === 'object' && ! Array.isArray(value));
const valueIsArray = value => Array.isArray(value);
const isNotNil = R.complement(R.isNil);
const isNotEquals = R.complement(R.equals);

module.exports = {
  log,
  makeMapFirstOfPairFn,
  mapKeysOfObject,
  valueNotObject,
  valueIsObject,
  valueIsArray,
  isNotNil,
  isNotEquals
};