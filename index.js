#!/usr/bin/env node

const childProcess = require('child_process');
const { promisify } = require('util');
const { prompt } = require('enquirer');
const style = require('ansi-colors');
const utils = require('./src/utils');

const exec = promisify(childProcess.exec);

(async function main() {
  utils.printWelcome();

  const gitUser = (await exec('git config user.email')).stdout.trim();
  console.log(`GitHub login:`);
  const res = await prompt([
    {
      type: 'input',
      name: 'username',
      message: 'Username',
      default: gitUser,
    },
    {
      type: 'password',
      name: 'pat',
      message: `Personal Access Token`,
    },
  ]);

  await utils.checkPermissions(res.username, res.pat);
})().catch((err) => {
  console.error(err);
});
