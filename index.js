#!/usr/bin/env node
const childProcess = require('child_process');
const { promisify } = require('util');
const { prompt } = require('enquirer');
const style = require('ansi-colors');
const utils = require('./src/utils');

if (process.env.ENV === 'dev') require('dotenv').config();

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
      styles: { primary: style.green },
    },
  ]);

  const USERNAME = res.username;
  const PAT = res.pat;

  if ((await utils.checkPermissions(USERNAME, PAT)) === false) {
    process.exit();
  }

  const repositories = await utils.getRepositories(USERNAME, PAT);
  console.log();
  res = await prompt([
    {
      type: 'autocomplete',
      name: 'repos',
      message: 'Select repositories you want to delete:',
      limit: 10,
      multiple: true,
      format: (value) => style.green(value),
      footer: '––—————––—————––—————––—————––————————————',
      result: (value) => {
        if (value.length === 0) {
          console.log(style.dim(` No repositories selected`));
          process.exit();
        }
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
    format: (value) => value,
    choices: [
      {
        name: 'Yes',
        message: `${style.redBright(
          `Yes, delete ${
            repoCount > 1 ? 'repositories' : 'repository'
          } (${repoCount})`
        )}`,
        value: true,
      },
      {
        name: 'Cancel',
        message: 'Cancel',
        value: false,
      },
    ],
  });

  if (res.confirmDelete === 'Yes') {
    let deletedRepos = 0;
    for (const repo of reposToDelete) {
      const status = await utils.deleteRepository(USERNAME, PAT, repo);
      if (status) {
        deletedRepos++;
      }
    }
    const messageConfirm = `🔫 pew pew! ${deletedRepos} repositories deleted suscessfully.`;
    const messageRecover = `Recover repositories from github.com/settings/repositories`;
    console.log(`${messageConfirm} ${style.dim(messageRecover)}`);
  } else {
    console.log(`${style.dim('Rest assured, no repositories were deleted')}`);
  }
})().catch((err) => {
  console.error(err);
});
