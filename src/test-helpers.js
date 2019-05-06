const {fillOutConfig} = require('./config');

const stdRawCfg = {
  delimiter: ',',
  batchSize: 50,
  fields: [
    {
      "name":"aa",
      "select":"step.duration",
      "map":"identity",
      "agg":"sum",
      "default": 0
    },
    {
      "name":"bb",
      "where":[
        {"Digits":{"not":"null"}}
      ],
      "select": 1,
      "map":"identity",
      "agg":"sum",
      "default": 0
    }
  ]
};

const stdSummFlds = ['a', 'b', 'c'];
const stdStepFlds = ['d', 'e', 'f'];

const stdCfg = fillOutConfig(stdSummFlds, stdStepFlds, stdRawCfg);

const sid = 'FNxxxx';

const stdStepTable = {
  sid: sid,
  rows: [
    {
      'step.sid': sid,
      'step.name': 'Trigger',
      'step.idx': 0,
      'step.duration': 0,
      'trigger.var1': 'val1',
      'trigger.var2': 'val2',
      'step.result': 'complete'
    },
    {
      'step.sid': sid,
      'step.name': 'aaa',
      'step.idx': 1,
      'step.duration': 1000,
      status_code: 200,
      body: 'some data',
      'step.result': 'complete'
    },
    {
      'step.sid': sid,
      'step.name': 'bbb',
      'step.idx': 2,
      'step.duration': 5000,
      'step.result': 'match',
      'Digits': '5'
    },
    {
      'step.sid': sid,
      'step.name': 'ccc',
      'step.idx': 3,
      'step.duration': 4000,
      'step.result': 'match',
      'Digits': '9'
    },
    {
      'step.sid': sid,
      'step.name': 'ddd',
      'step.idx': 4,
      'step.duration': 1000,
      'step.result': 'hangup'
    }
  ]
};

const stdExecAndContext = {
  execution: {
    sid: 'FNxxxx', accountSid: 'ACxxxx', dateCreated: '2019-04-28T01:19:48.000Z', dateUpdated: '2019-04-28T01:19:59.000Z'
  },
  context: {
    context: {
      trigger: {call: {CallSid:'CAxxxx', To:'+15551112222', From:'+12088747271'}}
    }
  }
}

const stdSteps = [
  {
    step: {
      'name': 'audioComplete',
      'transitionedFrom': 'ddd',
      'transitionedTo': 'Ended',
      'dateCreated': '2019-04-28T01:19:59.000Z'
    },
    context: {
      context: {
        widgets: {
          'aaa': {'vw1': 'val1', 'vw2': 'val2'},
          'bbb': {'vw3': 'val3','vw4': 'val4'},
          'ddd': {'vw5': 'val5','vw6': 6}
        },
        flow: {variables: {language: 'English'}},
        trigger: {call: {CallSid:'CAxxxx', To:'+15551112222', From:'+12088747271'}}
      }
    }
  },
  {
    step: {
      'name': 'audioComplete',
      'transitionedFrom': 'ccc',
      'transitionedTo': 'ddd',
      'dateCreated': '2019-04-28T01:19:58.000Z'
    },
    context: {
      context: {
        widgets: {
          'aaa': {'vw1': 'val1', 'vw2': 'val2'},
          'bbb': {'vw3': 'val3','vw4': 'val4'},
          'ccc': {'Digits': '3'}
        },
        flow: {variables: {language: 'English'}},
        trigger: {call: {CallSid:'CAxxxx', To:'+15551112222', From:'+12088747271'}}
      }
    }
  },
  {
    step: {
      'name': 'audioComplete',
      'transitionedFrom': 'bbb',
      'transitionedTo': 'ccc',
      'dateCreated': '2019-04-28T01:19:54.000Z'
    },
    context: {
      context: {
        widgets: {
          'aaa': {'vw1': 'val1', 'vw2': 'val2'},
          'bbb': {'vw3': 'val3','vw4': 'val4'}
        },
        flow: {variables: {language: 'English'}},
        trigger: {call: {CallSid:'CAxxxx', To:'+15551112222', From:'+12088747271'}}
      }
    }
  },
  {
    step: {
      'name': 'audioComplete',
      'transitionedFrom': 'aaa',
      'transitionedTo': 'bbb',
      'dateCreated': '2019-04-28T01:19:49.000Z'
    },
    context: {
      context: {
        widgets: {
          'aaa': {'vw1': 'val1', 'vw2': 'val2'}
        },
        flow: {variables: {language: 'Spanish'}},
        trigger: {call: {CallSid:'CAxxxx', To:'+15551112222', From:'+12088747271'}}
      }
    }
  },
  {
    step: {
      'name': 'audioComplete',
      'transitionedFrom': 'Trigger',
      'transitionedTo': 'aaa',
      'dateCreated': '2019-04-28T01:19:48.000Z'
    },
    context: {
      context: {
        widgets: {},
        flow: {},
        trigger: {call: {CallSid:'CAxxxx', To:'+15551112222', From:'+12088747271'}}
      }
    }
  }
];

const stdFlow = {
  sid: 'FWxxxx', friendlyName: 'test flow', version: 42
}

module.exports = {
  stdCfg,
  stdExecAndContext,
  stdFlow,
  stdRawCfg,
  stdSummFlds,
  stdStepFlds,
  stdSteps,
  stdStepTable
};