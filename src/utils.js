const style = require('ansi-colors');
const package = require('../package.json');

function printWelcome() {
  const name = package.name;
  const description = package.description;
  const version = package.version;

  if (name && description && version) {
    console.log(
      `Welcome to ${style.greenBright(name)} v${version}! ${description}`
    );
    console.log(description);
    console.log();
  }
}

module.exports = {
  printWelcome,
};
