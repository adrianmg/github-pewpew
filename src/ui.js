const style = require('ansi-colors');

const { getPackageDetails } = require('./config');

const PACKAGE = getPackageDetails().package;

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

module.exports = {
  printWelcome,
};
