#!/usr/bin/env node
const childProcess = require('child_process');
const { promisify } = require('util');
const { prompt } = require('enquirer');
const style = require('ansi-colors');
const utils = require('./src/utils');

if (process.env.ENV == 'dev') require('dotenv').config();

const exec = promisify(childProcess.exec);

(async function main() {
  utils.printWelcome();

  const gitUserEmail = (await exec('git config user.email')).stdout.trim();
  console.log(style.dim(`GitHub account:`));
  let res = await prompt([
    {
      type: 'input',
      name: 'username',
      message: 'Username',
      default: gitUserEmail,
    },
    {
      type: 'password',
      name: 'pat',
      message: `Personal Access Token`,
      default: process.env.PAT,
    },
  ]);

  await utils.checkPermissions(res.username, res.pat);

  const repositories = await utils.getRepositories(res.username, res.pat);
  console.log();
  res = await prompt([
    {
      type: 'autocomplete',
      name: 'repos',
      message: 'Select repositories',
      limit: 10,
      multiple: true,
      footer: '––—————––—————––—————––—————––—————',
      result: (value) => {
        if (value.length === 0) process.exit();
        return value;
      },
      choices: repositories.map(({ full_name }) => full_name),
    },
  ]);

  const reposToDelete = res.repos;
  const repoCount = reposToDelete.length;

  res = await prompt({
    type: 'select',
    name: 'confirmDelete',
    message: `Are you sure?`,
    choices: [
      `${style.redBright(
        `Yes, delete ${
          repoCount > 1 ? 'repositories' : 'repository'
        } (${repoCount})`
      )}`,
      'Cancel',
    ],
  });
})().catch((err) => {
  console.error(err);
});
