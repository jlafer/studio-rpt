const pgm = require('commander');

module.exports = () => {

  pgm
  .version('0.0.1');

  pgm
  .command('report')
  .description('generate CSV report of Studio executions')
  .option('-a, --acct <acct sid>', 'Twilio account sid')
  .option('-A, --auth <auth token>', 'Twilio auth token')
  .option('-f, --flowSid <flowSid>', 'a Studio workflow SID')
  .option('-F, --fromDt <from date>', 'the dateFrom as yyyy-mm-ddThh:mm:ss-hh:mm')
  .option('-T, --toDt [to date]', 'the dateTo as yyyy-mm-ddThh:mm:ss-hh:mm')
  .option('-c, --cfgPath <config path>', 'the config file path')
  .action(function (args) {
    require('./cmds/report')(args);
  });

  pgm
  .command('list')
  .description('list Studio objects')
  .option('-a, --acct <acct sid>', 'Twilio account sid')
  .option('-A, --auth <auth token>', 'Twilio auth token')
  .option('-t, --type <workflow, execution, step, etc>', 'the type of Studio object')
  .option('-f, --flowSid [flowSid]', 'a Studio workflow SID')
  .option('-F, --fromDt [from date]', 'the dateFrom as yyyy-mm-ddThh:mm:ss-hh:mm')
  .option('-T, --toDt [to date]', 'the dateTo as yyyy-mm-ddThh:mm:ss-hh:mm')
  .option('-s, --sid [object sid]', 'the SID of the object to get')
  .action(function (args) {
    require('./cmds/list')(args);
  });

  pgm
  .command('get')
  .description('get one stepRouter object')
  .option('-a, --acct <acct sid>', 'Twilio account sid')
  .option('-A, --auth <auth token>', 'Twilio auth token')
  .option('-t, --type <workflow, execution, step, etc>', 'the type of Studio object')
  .option('-f, --flowSid <flowSid>', 'a Studio workflow SID')
  .option('-s, --sid <object sid>', 'the SID of the object to get')
  .action(function (args) {
    require('./cmds/get')(args);
  });

  pgm.parse(process.argv);
}
 