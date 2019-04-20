const pgm = require('commander');

module.exports = () => {

  pgm
  .version('0.0.1');

  pgm
  .command('list')
  .description('list Studio objects')
  .option('-a, --acct <acct sid>', 'Twilio account sid')
  .option('-A, --auth <auth token>', 'Twilio auth token')
  .option('-t, --type <step, workflow, etc>', 'the type of Twilio object')
  .option('-w, --flow <flowSid>', 'a TR workflow SID')
  .action(function (args) {
    require('./cmds/list')(args);
  });

  pgm
  .command('get')
  .description('get one stepRouter object')
  .option('-a, --acct <acct sid>', 'Twilio account sid')
  .option('-A, --auth <auth token>', 'Twilio auth token')
  .option('-t, --type <workflow, step, etc>', 'the type of Twilio object')
  .option('-w, --flow <flowSid>', 'a TR workflow SID')
  .option('-s, --sid <object sid>', 'the SID of the object to get')
  .action(function (args) {
    require('./cmds/get')(args);
  });

  pgm.parse(process.argv);
}
 