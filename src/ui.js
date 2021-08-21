const style = require('ansi-colors');
const ora = require('ora');
const { prompt } = require('enquirer');
const clipboard = require('clipboardy');

const UTILS = require('./utils');
const GITHUB = require('./github');

function printWelcome() {
  const PACKAGE = UTILS.getPackageDetails().package;

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

  const token = await GITHUB.auth((verification) => {
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
    const repositories = await GITHUB.getRepositories();

    const count = repositories.length;
    const strSucceed = printReposFound(count);
    spinner.succeed(style.dim(strSucceed));

    return repositories;
  } catch (error) {
    spinner.stop();

    if (error instanceof GITHUB.AuthError) throw new GITHUB.AuthError();
    if (error instanceof GITHUB.ScopesError) throw new GITHUB.AuthError();
  }
}

function printReposFound(count) {
  const strMessage = `${count} ${count > 1 ? 'repositories' : 'repository'} found.`;

  return strMessage;
}

async function deleteRepositories(repositories) {
  let count = 0;

  for (const repo of repositories) {
    const spinner = ora(style.dim(repo)).start();

    const status = await GITHUB.deleteRepository(repo);

    if (status) {
      count++;
      spinner.stopAndPersist({ symbol: '', text: style.strikethrough.dim(repo) });
    } else {
      spinner.fail(style.dim(`${repo} [ERROR]`));
    }
  }

  printConfirmDelete(deletedRepos);
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
  const strConfirm = `🔫 pew pew! ${deletedRepos} repositories deleted suscessfully.`;
  const strRecover = `Recover repositories from github.com/settings/repositories`;

  console.log(strConfirm);
  console.log(style.dim(strRecover));

  return true;
}

// function printDeleteRepositoryStart(repo) {
//   return ora(style.dim(repo)).start();
// }

// function printDeleteRepositorySucceed(spinner, repo) {
//   return spinner.stopAndPersist({
//     symbol: '',
//     text: style.strikethrough.dim(repo),
//   });
// }

// function printDeleteRepositoryFailed(spinner, repo) {
//   strError = `${repo} [ERROR]`;

//   return spinner.fail(style.dim(strError));
// }

function printNoRepos(spinner) {
  const strMessage = `No repositories found.`;
  return spinner.fail(style.dim(strMessage));
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
  return console.log(style.redBright(strError));
}

module.exports = {
  printWelcome,
  promptAuth,
  getRepositories,
  promptSelectRepositories,
  deleteRepositories,
  promptConfirmDelete,
  printNoRepos,
  printNoReposDeleted,
  printNoReposSelected,
  printError,
};
