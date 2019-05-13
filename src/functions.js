const R = require('ramda');
const {makeMapFirstOfPairFn, mapKeysOfObject} = require('jlafer-fnal-util');

const addTriggerNamespace = R.concat('trigger.');
const addTriggerNamespaceToFirst = makeMapFirstOfPairFn(addTriggerNamespace);
const addTriggerNamespaceToVars = mapKeysOfObject(addTriggerNamespaceToFirst);
const getTriggerVars = R.pathOr({}, ['context', 'trigger', 'call']);
const qualifyTriggerVars = R.pipe(
  getTriggerVars, addTriggerNamespaceToVars
);

const addFlowNamespace = R.concat('flow.');
const addFlowNamespaceToFirst = makeMapFirstOfPairFn(addFlowNamespace);
const addFlowNamespaceToVars = mapKeysOfObject(addFlowNamespaceToFirst);
const getFlowVars = R.pathOr({}, ['context', 'flow', 'variables']);
const qualifyFlowVars = R.pipe(
  getFlowVars, addFlowNamespaceToVars
);

const addStepNamespace = R.concat('step.');
const addStepNamespaceToFirst = makeMapFirstOfPairFn(addStepNamespace);
const addStepNamespaceToVars = mapKeysOfObject(addStepNamespaceToFirst);

module.exports = {
  addStepNamespace,
  addStepNamespaceToVars,
  getFlowVars,
  getTriggerVars,
  qualifyFlowVars,
  qualifyTriggerVars
}