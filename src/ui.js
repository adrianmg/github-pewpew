const style = require('ansi-colors');
const ora = require('ora');
const { prompt } = require('enquirer');
const clipboard = require('clipboardy');

const Utils = require('./utils');
const Github = require('./github');

function printWelcome() {
  const PACKAGE = Utils.getPackageDetails().package;

  const name = PACKAGE.name;
  const description = PACKAGE.description;
  const version = PACKAGE.version;

  if (name && description && version) {
    console.log(`${style.bold(`${name} v${version}`)}`);
    console.log(description);
    console.log();
  }
}

async function promptAuth() {
  const strSignIn = `Sign in to GitHub:`;
  const spinner = ora();

  console.log(style.dim(strSignIn));

  const token = await Github.auth((verification) => {
    requestToken(verification);
    spinner.start();

    clipboard.writeSync(verification.user_code);
  });

  spinner.stop();
  console.log();

  return token;
}

function requestToken(verification) {
  const strOpen = `Open:`;
  const strURL = verification.verification_uri;
  const strCode = `Code:`;
  const strCodeValue = verification.user_code;
  const strClipboard = `Copied to clipboard!`;

  console.log(`${style.bold(strOpen)} ${style.cyan.underline(strURL)}`);
  console.log(`${style.bold(strCode)} ${strCodeValue} ${style.dim(strClipboard)}`);
}

async function promptSelectRepositories(repositories) {
  try {
    if (repositories.length === 0) throw error;

    return await prompt({
      type: 'autocomplete',
      name: 'repos',
      message: 'Select repositories you want to delete:',
      limit: 12,
      multiple: true,
      footer: '––—————––—————––—————––—————––————————————',
      format: (value) => style.green(value),
      choices: repositories.map(({ full_name }) => full_name),
    });
  } catch (error) {
    return { repos: [] };
  }
}

async function getRepositories() {
  const strMessage = `Fetching repositories…`;
  const spinner = ora(strMessage).start();

  try {
    const repositories = await Github.getRepositories();

    const count = repositories.length;
    const strSucceed = printReposFound(count);
    spinner.succeed(style.dim(strSucceed));

    return repositories;
  } catch (error) {
    spinner.stop();

    if (error instanceof Github.AuthError || error instanceof Github.ScopesError) {
      throw error;
    }
  }
}

function printReposFound(count) {
  const strMessage = `${count} ${count > 1 ? 'repositories' : 'repository'} found.`;

  return strMessage;
}

async function deleteRepositories(repositories) {
  const deletedRepos = [];

  for (const repo of repositories) {
    const spinner = ora().start();

    try {
      await Github.deleteRepository(repo);
      deletedRepos.push(repo);

      spinner.stopAndPersist({ symbol: '', text: style.strikethrough.dim(repo) });
    } catch (error) {
      const message = error.response?.data?.message;

      spinner.fail(style.dim(`${repo} (Oops! ${message})`));
    }
  }

  if (deletedRepos.length > 0) {
    printConfirmDelete(deletedRepos);
  } else {
    printNoReposDeleted();
  }
}

async function promptConfirmDelete(repoCount) {
  return await prompt({
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
}

function printConfirmDelete(deletedRepos) {
  const count = deletedRepos.length;

  const strDeletedRepos = count > 1 ? deletedRepos.join(', ') : deletedRepos;
  const strRepos = count > 1 ? 'repositories' : 'repository';
  const strConfirm = `🔫 pew pew! ${count} ${strRepos} deleted successfully: ${strDeletedRepos}`;
  const strRecover = `Recover repositories from github.com/settings/repositories`;

  console.log(strConfirm);
  console.log(style.dim(strRecover));

  return true;
}

function printNoReposDeleted() {
  const strMessage = `Rest assured, no repositories were deleted.`;

  return console.log(style.dim(strMessage));
}

function printNoReposSelected() {
  const strMessage = `No repositories selected.`;

  return console.log(style.dim(strMessage));
}

function printError(strError) {
  console.log();
  return console.log(style.redBright(strError));
}

module.exports = {
  printWelcome,
  promptAuth,
  getRepositories,
  promptSelectRepositories,
  deleteRepositories,
  promptConfirmDelete,
  printNoReposDeleted,
  printNoReposSelected,
  printError,
};
