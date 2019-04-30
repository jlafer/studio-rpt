# studio-rpt

This project contains a CLI program that reports on Twilio Studio flows.

## Installation
Clone this repo and then install dependencies.

    npm install

## Command-line Interface
    studiorpt list
    studiorpt report

The commands above are for listing Studio events.

Please run `studiorpt --help` at the command-line to see commands and arguments.
You can run `studiorpt <cmd> --help` to see command-specific arguments.

## Usage

List all workflows:
```
studiorpt list -t workflow -a <ACCT_SID> -A <AUTH_TOKEN>
```

List all steps of a workflow:
```
studiorpt list -t step -a <ACCT_SID> -A <AUTH_TOKEN> -w <FLOW_SID>
```

Report on workflows:
```
studiorpt report -a <ACCT_SID> -A <AUTH_TOKEN> -w <FLOW_SID> -F 2019-04-27T13:00:00-07:00 -T 2019-04-27T14:00:00-07:00
```
## Reportable Data

Each studio execution provides the following data:
sid - the execution SID
accountSid - the account SID
callSid - the call SID
appName - the Studio flow name
appVersion - the Studio flow version
startTime - the starting timestamp of the execution, in ISO 8601 format (GMT)
endTime - the ending timestamp of the execution, in ISO 8601 format (GMT)
from - the phone number of the caller
to - the Twilio phone number dialed
lastStep - the name of the last widget executed
stepRpts - an array of the steps executed
[custom fields]

### Gather Input on Call
msg - will contain one of: "Gather End"
FlowEvent - will contain one of: "audioComplete", "timeout"
Digits - digit(s) pressed if caller used DTMF
SpeechResult - text for caller's speech if the caller used speech
Confidence - confidence, expressed as a decimal string between 0.000 and 1.000, if the caller used speech
Language - speech recognition language if the caller used speech

### Send to Flex
QueueResult - will contain one of: "redirected", "hangup"
QueueTime - time in queue, in seconds
QueueSid - the SID of the queue into which the task was placed

### Run Function
status_code - the HTTP status code number (e.g., 200)
content_type - the response content type (e.g., "application/json")
parsed - if the content type was JSON

