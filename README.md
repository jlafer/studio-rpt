# studio-rpt
This project contains a CLI program that reports on Twilio Studio flow executions.

## Installation
Clone this repo and then install dependencies.

    npm install

## Command-line Interface
    studiorpt list
    studiorpt report

The commands above are for listing and reporting on Studio executions and steps.

Please run `studiorpt --help` at the command-line to see commands and arguments.
You can run `studiorpt <cmd> --help` to see command-specific arguments.

## Usage
The `list` command is useful for reviewing the data that is available for reporting on Studio executions and for diagnosing individual executions.

List all workflows:
```
studiorpt list -t workflow -a <ACCT_SID> -A <AUTH_TOKEN>
```

List executions for a workflow, within a date/time range (specified with ISO 8601 strings):
```
studiorpt list -t execution -a <ACCT_SID> -A <AUTH_TOKEN> -f <FLOW_SID> -F <FROM_TS> -T <TO_TS>
```

List all steps of a workflow execution:
```
studiorpt list -t step -a <ACCT_SID> -A <AUTH_TOKEN> -f <FLOW_SID> -s <EXECUTION_SID>
```

Report on workflows, within a date/time range (specified with ISO 8601 strings):
```
studiorpt report -a <ACCT_SID> -A <AUTH_TOKEN> -f <FLOW_SID> -F <FROM_TS> -T <TO_TS>
```

# Reporting
The `studiorpt report` command can be used for producing CSV-format report files. Suggested usage is to set up a scheduled task (e.g., with `cron`) to extract data on a regular interval, such as hourly.

Two output files can be produced -- an execution summary report and/or a detailed step execution report. The output directory command-line argument (`--outdir`) is used to specify where the files are written.

File names take the following format:
- execution summary reports: {workflow SID}\_{workflow version}\_summary\_{FROM_TS}\_{TO_TS}.csv
- execution detail reports: {workflow SID}\_{workflow version}\_detail\_{FROM_TS}\_{TO_TS}.csv

## Report Data
The summary report provides the following fields for each execution:
- sid - the execution SID
- appName - the Studio flow name
- appVersion - the Studio flow version
- startTime - the starting timestamp of the execution, in ISO 8601 format using the local timezone
- endTime - the ending timestamp of the execution, in ISO 8601 format
- duration - the execution time, in mSec (currently rounded to one second)
- lastStep - the name of the last widget executed
- result - the event reported by Studio for the last-executed widget in the execution
- callSid - the call SID
- from - the phone number of the caller
- to - the Twilio phone number dialed
- endMethod - the method by which the Studio execution ended: either `hangup` or `redirect`
- endBy - the party responsible for ending the execution: either `user`, `app` or `unknown`; the Studio application can use the `Set Variable` widget to set the `endBy` variable and override the value set by the program
- endReason - the reason for ending the execution; this field must be populated in the Studio application, which can use the `Set Variable` widget to set the `endReason` variable; the suggested value is one of: `agent`, `self-service`, `timeout`, `no-match` or `error`
- [custom execution fields]

The detail report provides the following fields for each execution step:
- sid - the execution SID
- stepClass - the Studio widget class for this step
- name - the Studio widget name for this step
- idx - the index (or sequence) number of the step in the order of execution
- transitionedTo - the name of the widget in the following step
- startTime - the starting timestamp of the step, in ISO 8601 format
- endTime - the ending timestamp of the step, in ISO 8601 format
- duration - the time spent in the step, in mSec (currently rounded to one second)
- elapsed - the elapsed time from the start of the flow execution through the end of this step, in mSec
- result - the result reported by the Studio engine for this step
- [custom step fields] (FUTURE)

## Known limitations
- Only voice flows are currently supported by the `report` command.
- There is no data on flow config (e.g., DTMF-allowed on menu, timeout values).
- There is no count of repeated menus due to a timeout.
- The granularity of timing is 1 second.
- There is no Task SID for tasks that are sent to be routed. This would make it easier to join the studiorpt data with that in Flex WFO.

Please let me know if there are other features that you would like to see in the program.

## Configuration
Custom fields can be configured and included in the summary execution report. Custom fields are specified in a `config.json` file, whose location is indicated with the --cfgPath command-line argument. A sample config file is located in the project folder (`sample-config.json`). The required file format is outlined below.

The report configuration file must follow this format:
```
{
  "delimiter":DELIMITER,
  "fields":[
    {
      "name":"NAME",
      "where":[CLAUSE, ...],
      "select":SELECTION,
      "map":"FNAME",
      "agg":"AGGNAME",
      "dlft":VALUE
    },
    ...
  ],
  "batchSize": integer
}

DELIMITER :: ',' || '\t'
CLAUSE ::
  {"VARNAME":VALUE}
  || {"VARNAME":[VALUE, ...]}
  || {"VARNAME": {OPERATOR: OPERAND}, ...}}
OPERATOR :: not || gt || lt
OPERAND :: null || VALUE
NAME :: <widget name>
SELECTION :: VARNAME || VALUE
VARNAME :: <var> || step.<var> || flow.<var> || trigger.<var>
VALUE :: string || integer
FNAME :: identity || <custom mapFunction>
AGGNAME :: first || last || sum || count || unique || max || exists || path
```

Configuration Notes
- A `where` clause can select zero or more steps from an execution. It is these steps from which the `select` clause will obtain the value of an execution variable.
- When multiple conditions are included within a single `where` clause, their evaluation results are combined with an implied logical-and operation.
- When multiple `where` clauses are specified their evaluation results are combined with an implied logical-or operation.
- The `select` clause specifies the execution variable from which raw data will be drawn to populate the custom field.
- The `map` clause can provide a mapping function to be applied to the raw value(s) obtained by the `select` clause. The `identity` function is the default.
- The `agg` clause can aggregate the mapped values to a final value.
- The `dflt` clause can specify a default value when the result of aggregation is null or undefined.
- If a widget variable must be mapped to another format, this can be done by adding a mapping function property to the object in `src/mapFunctions.js`. The key of this property can then be used in the `map` clause of custom fields.

## Variable Data
When specifying source data in the config file for the purpose of creating custom fields, "trigger", "step", "widget" and "flow" variables are available for use in the `where` and `select` properties.

The trigger properties are those added to the flow context during triggering of the flow and visible in the Studio log. These are prefixed to create names like `trigger.from` and `trigger.to`.

The step properties are those listed in the description of the detail step records above and are prefixed to create names like `step.stepClass`, `step.name` and `step.idx`.

The widget variables have no prefix and are listed below, under the heading of the Studio widget types for which they are populated.

The flow variables are prefixed with `flow.` and represent variables set with the `Set Variables` widget. Your Flow may change their value during the course of an execution; if you need the variable value at a certain point in the execution, use the `where` clause to specify the widget or execution step and select the value at that point.

The `studiorpt list --type step` command can be useful for reviewing the variables that are available at each step of an execution. You can also examine the Studio log for particular executions to see the data that are available.

## Widget-specific Variable Data
Below is a list of the widget variables that are present with widgets of the various classes. [NOTE: this list is not yet comprehensive!]

### Gather Input on Call
- msg - will contain one of: "Gather End"
- FlowEvent - will contain one of: "audioComplete" if input was collected; "timeout" if no input was collected
- CallStatus - "in-progress" if the flow transitioned from the Gather widget; "completed" if the caller hung up
- Digits - digit(s) pressed if caller used DTMF
- SpeechResult - text for caller's speech if the caller used speech
- Confidence - confidence, expressed as a decimal string between 0.000 and 1.000, if the caller used speech
- Language - speech recognition language if the caller used speech

### Send to Flex
- QueueResult - will contain one of: "redirected", "hangup"
- QueueTime - time in queue, in seconds
- QueueSid - the SID of the queue into which the task was placed

### Run Function and HTTP Request
- status_code - the HTTP status code number (e.g., 200)
- content_type - the response content type (e.g., "application/json")
- parsed - the parsed JSON data returned by the function, if the content\_type was `application/json`
- body - the raw text data returned by the function, if the content\_type was `text/plain`

### Connect Call To
- DialCallStatus - will contain one of: "completed", 
- DialCallDuration - time of the dialed call, in seconds
- DialCallSid - the SID of the dialed call
- CallStatus - will contain "in-progress"

## Release Notes
1.0.3
- Added support for default field configuration properties.
- BREAKING CHANGE - changed `field.default` to `field.dflt` in config file. 

1.0.4
- Added validation of configuration properties.
- Added the `unique` aggregation type, which produces a unique count of values returned by the `select` and `map` steps.

1.0.5
- Added documentation on custom field configuration clauses.
- Fixed a bug in which the default value for custom fields was used both before and after aggregation.
- Added support for custom value-mapping functions.

## Legal
This software is distributed under the MIT license (see LICENSE.txt). All re-use of this software should clearly cite Twilio, Inc.