#! /usr/bin/env node
const { run, log } = require('./rmnpm');

run().catch((err) => log(err));
