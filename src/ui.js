const style = require('ansi-colors');
const { prompt } = require('enquirer');

const PACKAGE = require('./config').getPackageDetails().package;

function printWelcome() {
  const name = PACKAGE.name;
  const description = PACKAGE.description;
  const version = PACKAGE.version;

  if (name && description && version) {
    console.log(`${style.bold(`${name} v${version}`)}`);
    console.log(description);
    console.log();
  }
}

async function promptGetRepositories(repositories) {
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
  promptGetRepositories,
  promptConfirmDelete,
  printConfirmDelete,
  printNoReposDeleted,
  printNoReposSelected,
  printError,
};
