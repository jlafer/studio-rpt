# studio-rpt

This project contains a CLI program that reports on Twilio Studio flows.

## Installation
Clone this repo and then install dependencies.

    npm install

## Command-line Interface
    studiorpt list

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
