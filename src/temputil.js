const R = require('ramda');

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

module.exports = {
  makeMapFirstOfPairFn,
  mapKeysOfObject
};