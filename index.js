#! /usr/bin/env node
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const homedir = os.homedir();
const prettyMilliseconds = require('pretty-ms');
const argv = require('minimist')(process.argv.slice(2));

const { LocalStorage } = require('node-localstorage');
const tempNodeModulesPath = path.join(
  os.tmpdir(),
  `node_modules_to_remove_${new Date().getTime()}`
);
const nodeModules = 'node_modules';
const storagePath = path.resolve(homedir, '.rmnpm');

function moveNodeModules(destPath) {
  log(`Moving ${nodeModules} to ${destPath}.`);
  try {
    fs.renameSync(`./${nodeModules}`, destPath);
    log(`${nodeModules} successfully moved to ${destPath}.`);
  } catch (e) {
    log(`Failed to move ${nodeModules} to ${destPath}.`, e);
  }
}

function asyncRemoveNodeModules(folderName) {
  if (!fs.existsSync(folderName)) {
    log(`${folderName} doesn't exist.`);
    return Promise.resolve(0);
  }

  log(`Starting to remove ${folderName}.`);
  const startTime = new Date();
  return new Promise((resolve, reject) => {
    fs.rmdir(folderName, { recursive: true }, (err) => {
      if (err) {
        log(`Failed to remove ${folderName}.`, err);
        reject(err);
        return;
      }

      log(`${folderName} is removed.`);
      const elapsedTimeMs = new Date() - startTime;
      resolve(elapsedTimeMs);
    });
  });
}

function asyncNpmInstall() {
  const startTime = new Date();
  log('npm install started.');
  const npmArgs = argv['use-lock-file'] ? ['ci', '--prefer-offline'] : ['i'];
  const child = spawn('npm', npmArgs, { stdio: 'inherit' });

  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        const elapsedTimeMs = new Date() - startTime;
        log('Finished npm install.');
        resolve(elapsedTimeMs);
      } else {
        reject('npm install failed with error code: ' + code);
      }
    });
  });
}

function removePackageLock() {
  if (fs.existsSync('package-lock.json')) {
    log('Removing package-lock.json.');
    fs.unlinkSync('package-lock.json');
    log('package-lock.json is removed.');
  } else {
    log('No package-lock.json file.');
  }
}

function log(text, ...args) {
  if (argv['quiet']) {
    return;
  }

  console.log(`${new Date()}: ${text}`, ...args);
}

async function run() {
  const storage = new LocalStorage(storagePath);

  if (argv['clear-cache']) {
    await storage.clear();
    log('Cache cleared, exiting.');
    return;
  }

  if (argv['v'] || argv['version']) {
    const { version } = require('./package.json');
    console.log(version);
    return;
  }

  log('Started.');
  const startTime = new Date();

  if (argv['pull'] || argv['p']) {
    try {
      const simpleGit = require('simple-git');
      const git = simpleGit();
      log('Updating code.');
      await git.pull(['--rebase=false']);
      log('Code updated.');
    } catch (e) {
      console.log(e.message);
      log('Failed to update code.');
      return;
    }
  }

  let removeNodeModulesPromise;
  if (fs.existsSync(nodeModules)) {
    moveNodeModules(tempNodeModulesPath);
    removeNodeModulesPromise = asyncRemoveNodeModules(tempNodeModulesPath);
  } else {
    log(`${nodeModules} does'nt exist.`);
  }

  if ((argv['r'] && argv['l']) || argv['rl'] || argv['remove-lock-file']) {
    removePackageLock();
  }

  const npmInstallPromise = asyncNpmInstall();

  const [removeNodeModulesTimeMs, npmInstallTimeMs] = await Promise.all([
    removeNodeModulesPromise,
    npmInstallPromise,
  ]);

  const totalTimeMs = new Date() - startTime;
  const timeSavedMs = Math.min(removeNodeModulesTimeMs || 0, npmInstallTimeMs);
  const previousTotalTimeSavedMs =
    parseInt(await storage.getItem('rmnpm.totalTimeSavedMs')) || 0;

  const newTotalTimeSavedMs = previousTotalTimeSavedMs + timeSavedMs;
  await storage.setItem('rmnpm.totalTimeSavedMs', newTotalTimeSavedMs);

  log(`Total time ${prettyMilliseconds(totalTimeMs)}.`);

  if (!timeSavedMs) {
    return;
  }

  log(
    `You've just saved ${prettyMilliseconds(timeSavedMs)} (${prettyMilliseconds(
      newTotalTimeSavedMs
    )} in total).`
  );
}

run().catch((err) => log(err));
