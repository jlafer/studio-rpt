# studio-rpt

This project contains a CLI program that reports on Twilio Studio flows.

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
- execution summary reports: {workflow app}\_{workflow version}\_summary\_{FROM_TS}\_{TO_TS}.csv
- execution detail reports: {workflow app}\_{workflow version}\_detail\_{FROM_TS}\_{TO_TS}.csv

## Report Data
Each summary execution report provides the following fields:
- sid - the execution SID
- accountSid - the account SID
- callSid - the call SID
- appName - the Studio flow name
- appVersion - the Studio flow version
- startTime - the starting timestamp of the execution, in ISO 8601 format (GMT)
- endTime - the ending timestamp of the execution, in ISO 8601 format (GMT)
- from - the phone number of the caller
- to - the Twilio phone number dialed
- lastStep - the name of the last widget executed
- [custom flow fields]

Each detail report provides the following fields:
- sid - the execution SID
- accountSid - the account SID
- name - the Studio widget name for this step
- idx - the index (or sequence) number of the step in the order of execution
- transitionedTo - the name of the widget in the following step
- startTime - the starting timestamp of the execution, in ISO 8601 format (GMT)
- endTime - the ending timestamp of the execution, in ISO 8601 format (GMT)
- duration - the time spent in the step, in mSec (currently rounded to one second)
- elapsed - the elapsed time from the start of the flow execution through the end of this step, in mSec
- result - the result reported by the Studio engine for this step
- [custom step fields]

## Known limitations
- There is no data on flow config (e.g., DTMF-allowed on menu, timeout values).
- There is no selecting of steps by widget class - only by name(s) or other step variable.
- There is no count of repeated menus due to a timeout.
- The granularity of timing is 1 second.
- There is no Task SID for tasks that are sent to be routed. This would make it easier to join the studiorpt data with that in Flex WFO.

Please let me know if there are other features that you would like to see in the program.

## Configuration
Custom fields can be configured that are reported as fields in the summary execution report. Custom fields are specified in a `config.json` file, whose location is indicated with the --cfgPath command-line argument. A sample config file is located in the project folder (`sample-config.json`). The required file format is outlined below.

The report configuration file must follow this format:
```
{
  "fields":[
    {
      "name":"NAME",
      "where":[CLAUSE, ...],
      "select":"VARNAME",
      "map":"FNAME",
      "agg":"AGGNAME",
      "default":VALUE
    },
    ...
  ]
}

CLAUSE ::
  {"VARNAME":VALUE}
  || {"VARNAME":[VALUE, ...]}
  || {"VARNAME": {OPERATOR: OPERAND}, ...}}
OPERATOR :: not || gt || lt
OPERAND :: null || VALUE
NAME :: <widget name>
VARNAME :: <var name> || step.<var name> || flow.<var name>
VALUE :: string || integer
FNAME :: identity
AGGNAME :: first || last || sum || count || max || path
```

## Variable Data
When specifying source data in the config file for the purpose of creating custom fields, widget and step variables are available for use in the `filters` clause and `select` properties.

The step properties are listed above and are named like `step.name` or `step.idx`.

The widget variables have no prefix and are listed below, under the heading of the Studio widget types for which they are populated.

In addition there are a large number of flow variables that can be used, including the network property variables provided by Studio in the `Trigger` widget. These are also available as widget variables for some other widget types, including `Say/Play`. The `studiorpt list --type step` command can be useful for reviewing the variables that are available at each step of execution.

## Widget-specific Variable Data
Below is a list of the widget variables that are present with widgets of the various types. [NOTE: this list is not comprehensive!]

### Gather Input on Call
- msg - will contain one of: "Gather End"
- FlowEvent - will contain one of: "audioComplete", "timeout"
- Digits - digit(s) pressed if caller used DTMF
- SpeechResult - text for caller's speech if the caller used speech
- Confidence - confidence, expressed as a decimal string between 0.000 and 1.000, if the caller used speech
- Language - speech recognition language if the caller used speech

### Send to Flex
- QueueResult - will contain one of: "redirected", "hangup"
- QueueTime - time in queue, in seconds
- QueueSid - the SID of the queue into which the task was placed

### Run Function
- status_code - the HTTP status code number (e.g., 200)
- content_type - the response content type (e.g., "application/json")
- parsed - the parsed JSON data returned by the function, if the content\_type was `application/json`
- body - the raw text data returned by the function, if the content\_type was `text/plain`

