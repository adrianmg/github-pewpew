#!/usr/bin/env node

const childProcess = require('child_process');
const { prompt } = require('enquirer');
const { promisify } = require('util');
const utils = require('./src/utils');

const exec = promisify(childProcess.exec);

(async function main() {
  utils.printWelcome();

  const username = (await exec('git config user.email')).stdout.trim();

  const res = await prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Username',
      default: username,
    },
    {
      type: 'password',
      name: 'pat',
      message: 'Personal access token (PAT)',
    },
  ]);
})().catch((err) => {
  console.error(err);
});
