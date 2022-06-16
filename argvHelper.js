const yargs = require('yargs/yargs')(process.argv.slice(2));

const getArgv = () => {
  return yargs
    .usage('Usage: $0 [options]')
    .example(
      '$0 -p -r',
      'Update the code and remove the lock file before reinstalling all the packages'
    )
    .alias('p', 'pull')
    .describe('p', 'Update the code')
    .alias('r', 'remove-lock-file')
    .describe('r', 'Remove the package-lock.json file if exists')
    .alias('l', 'use-lock-file')
    .describe(
      'l',
      'Use a lock file, runs npm ci --prefer-offline instead of npm i'
    )
    .alias('q', 'quiet')
    .describe(
      'q',
      'Run without rmnpm logs (will still show the output of the commands it runs)'
    )
    .describe('clear-cache', 'Clear the ‘Total time saved’ data')
    .help('h')
    .alias('h', 'help')
    .alias('v', 'version')
    .wrap(null).argv;
};

module.exports = { getArgv };
