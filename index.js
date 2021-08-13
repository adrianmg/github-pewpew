#!/usr/bin/env node
const { prompt } = require('enquirer');
const ora = require('ora');
const clipboard = require('clipboardy');
const style = require('ansi-colors');
const utils = require('./src/utils');
const { createOAuthDeviceAuth } = require('@octokit/auth-oauth-device');

(async function main() {
  utils.printWelcome();

  console.log(style.dim(`Sign in to GitHub:`));

  const spinner = ora();
  const CLIENT_ID = 'ed7c193c5b64ee06192a';
  const auth = createOAuthDeviceAuth({
    clientType: 'oauth-app',
    clientId: CLIENT_ID,
    scopes: ['delete_repo'],
    async onVerification(verification) {
      await console.log(
        `${style.bold(`Open:`)} ${style.cyan(
          style.underline(verification.verification_uri)
        )}`
      );
      await console.log(
        `${style.bold('Code:')} ${verification.user_code} ${style.dim(
          'Copied to clipboard!'
        )}`
      );
      clipboard.writeSync(verification.user_code);

      spinner.start();
    },
  });

  const { token } = await auth({ type: 'oauth' });
  process.env.GITHUB_TOKEN = token;
  spinner.stop();

  const repositories = await utils.getRepositories();
  res = await prompt([
    {
      type: 'autocomplete',
      name: 'repos',
      message: 'Select repositories you want to delete:',
      limit: 12,
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
          `Yes, delete ${repoCount > 1 ? 'repositories' : 'repository'} (${repoCount})`
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
      const status = await utils.deleteRepository(GITHUB_TOKEN, repo);
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
