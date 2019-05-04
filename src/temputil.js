const R = require('ramda');
const fs = require('fs');

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

const openFile = (path, mode) => {
  return new Promise(function(resolve, reject) {
    fs.open(path, mode,
      function(err, fd) {
        if (err)
          reject(err);
        else
          resolve(fd);
      }
    );
  });
};

const writeToFile = (fd, text) => {
  return new Promise(function(resolve, reject) {
    fs.appendFile(fd, text, 'utf8',
      function(err, fd) {
        if (err)
          reject(err);
        else
          resolve(null);
      }
    );
  });
};

const closeFile = (fd) => {
  return new Promise(function(resolve, reject) {
    fs.close(fd,
      function(err, fd) {
        if (err)
          reject(err);
        else
          resolve(null);
      }
    );
  });
};

const openStream = (path) => {
  return fs.createWriteStream(path);
};

const writeRcdsToStream = (stream, rcds) => {
  rcds.forEach(rcd => {
    writeToStream(stream, rcd);
  });
};

const writeToStream = (stream, text) => {
  stream.write(text);
};

const closeStream = (stream) => {
  stream.end();
};

module.exports = {
  log,
  makeMapFirstOfPairFn,
  mapKeysOfObject,
  valueNotObject,
  valueIsObject,
  valueIsArray,
  isNotNil,
  isNotEquals,
  openStream,
  writeToStream,
  writeRcdsToStream,
  closeStream
};