const style = require('ansi-colors');

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

module.exports = {
  printWelcome,
  printConfirmDelete,
  printNoReposDeleted,
  printNoReposSelected,
};
