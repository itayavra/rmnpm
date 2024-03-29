const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const util = require('util');
const prettyMilliseconds = require('pretty-ms');
const { cyan, bold, green } = require('chalk');
const dateFormat = require('dateformat');

const homedir = os.homedir();
const argv = require('./argvHelper').getArgv();

const { LocalStorage } = require('node-localstorage');
const tempNodeModulesPath = path.join(
  os.tmpdir(),
  `node_modules_to_remove_${new Date().getTime()}`
);
const nodeModules = 'node_modules';
const storagePath = path.resolve(homedir, '.rmnpm');

const highlight = green;
const error = bold.red;

function moveNodeModules(destPath) {
  log(`Moving ${nodeModules} to ${highlight(destPath)}.`);
  try {
    fs.renameSync(`./${nodeModules}`, destPath);
    log(`${nodeModules} successfully moved to ${highlight(destPath)}.`);
  } catch (e) {
    log(error(`Failed to move ${nodeModules} to ${destPath}.`), e);
  }
}

function asyncRemoveNodeModules(folderName) {
  if (!fs.existsSync(folderName)) {
    log(`${highlight(folderName)} doesn't exist.`);
    return Promise.resolve(0);
  }

  log(`Starting to remove ${highlight(folderName)}.`);
  const startTime = new Date();
  return new Promise((resolve, reject) => {
    fs.rmdir(folderName, { recursive: true }, (err) => {
      if (err) {
        console.log(err);
        log(error(`Failed to remove ${folderName}.`));
        reject(err);
        return;
      }

      log(`${highlight(folderName)} removed.`);
      const elapsedTimeMs = new Date() - startTime;
      resolve(elapsedTimeMs);
    });
  });
}

function asyncNpmInstall() {
  const startTime = new Date();
  const npmInstallText = 'npm install';

  log(`${npmInstallText} started.`);
  let npmArgs = argv['use-lock-file'] ? ['ci', '--prefer-offline'] : ['i'];
  if (argv['_']) {
    npmArgs = [...npmArgs, ...argv['_']];
  }

  const child = spawn('npm', npmArgs, { stdio: 'inherit' });

  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        const elapsedTimeMs = new Date() - startTime;
        log(`${npmInstallText} finished.`);
        resolve(elapsedTimeMs);
      } else {
        reject(error(`${npmInstallText} failed with error code: ${code}`));
      }
    });
  });
}

function removePackageLock() {
  const packageLockFileText = 'package-lock.json';
  if (fs.existsSync('package-lock.json')) {
    log(`Removing ${packageLockFileText}.`);
    fs.unlinkSync('package-lock.json');
    log(`${packageLockFileText} is removed.`);
  } else {
    log(`No ${packageLockFileText} file.`);
  }
}

function log(text, ...args) {
  if (argv['quiet']) {
    return;
  }

  const date = cyan(`${dateFormat(new Date())}:`);
  console.log(`${date} ${text}`, ...args);
}

async function run() {
  const storage = new LocalStorage(storagePath);

  if (argv['clear-cache']) {
    await storage.clear();
    log('Cache cleared, exiting.');
    return;
  }

  log('Started.');
  const startTime = new Date();

  if (argv['pull']) {
    try {
      const simpleGit = require('simple-git');
      const git = simpleGit();
      log('Updating code.');
      await git.pull(['--rebase=false']);
      log('Code updated.');
    } catch (e) {
      console.log(e.message);
      log(error('Failed to update code.'));
      return;
    }
  }

  let removeNodeModulesPromise;
  if (fs.existsSync(nodeModules)) {
    moveNodeModules(tempNodeModulesPath);
    removeNodeModulesPromise = asyncRemoveNodeModules(tempNodeModulesPath);
  } else {
    log(`${nodeModules} does'nt exist.`);
    removeNodeModulesPromise = Promise.resolve();
  }

  if (argv['remove-lock-file']) {
    removePackageLock();
  }

  let npmInstallPromise;
  if (argv['skip-install']) {
    log('Skipping npm install');
    npmInstallPromise = Promise.resolve();
  } else {
    npmInstallPromise = asyncNpmInstall();
  }

  npmInstallPromise.then((res) => {
    if (util.inspect(removeNodeModulesPromise).includes('pending')) {
      log(`Waiting to finish removing ${highlight(tempNodeModulesPath)}.`);
    }
    return res;
  });

  const [removeNodeModulesResult, npmInstallResult] = await Promise.allSettled([
    removeNodeModulesPromise,
    npmInstallPromise,
  ]);

  if (npmInstallResult.status === 'rejected') {
    log(npmInstallResult.reason);
    return;
  }

  const removeNodeModulesTimeMs = removeNodeModulesResult.value || 0;
  const npmInstallTimeMs = npmInstallResult.value;

  const totalTimeMs = new Date() - startTime;
  log(`Finished in ${bold(prettyMilliseconds(totalTimeMs))}.`);

  const timeSavedMs = Math.min(removeNodeModulesTimeMs, npmInstallTimeMs);
  if (!timeSavedMs) {
    return;
  }

  const previousTotalTimeSavedMs = parseInt(await storage.getItem('rmnpm.totalTimeSavedMs')) || 0;
  const newTotalTimeSavedMs = previousTotalTimeSavedMs + timeSavedMs;
  await storage.setItem('rmnpm.totalTimeSavedMs', newTotalTimeSavedMs);

  const timeSavedText = `You've just saved ${highlight.bold(prettyMilliseconds(timeSavedMs))}`;
  log(`${timeSavedText}, and ${highlight.bold(prettyMilliseconds(newTotalTimeSavedMs))} in total.`);

  return { timeSavedMs, totalTimeSavedMs: newTotalTimeSavedMs };
}

module.exports = {
  run,
  log,
  highlight,
  error,
  storagePath,
};
