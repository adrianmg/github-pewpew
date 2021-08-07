const childProcess = require('child_process');
const { promisify } = require('util');
const package = require('../package.json');
const style = require('ansi-colors');
const ora = require('ora');

const exec = promisify(childProcess.exec);

function printWelcome() {
  const name = package.name;
  const description = package.description;
  const version = package.version;

  if (name && description && version) {
    console.log(`Welcome to ${style.greenBright(`${name} v${version}`)}`);
    console.log(description);
    console.log();
  }
}

async function checkPermissions(username, pat) {
  let spinner = ora('Checking permissions…');
  spinner.start();
  await new Promise((resolve) => {
    setTimeout(resolve, 1500);
  });

  const curl = `curl --head -u ${username}:${pat} https://api.github.com/users/adrianmg`;
  const { stdout } = await exec(curl);

  if (!stdout.includes('delete_repo')) {
    spinner.fail(
      `Oops! Check your account details. You can generate a PAT (scoped to 'delete_repo') on https://github.com/settings/tokens`
    );
    process.exit(0);
  }

  spinner.succeed(`Permissions OK`);
  return true;
}

module.exports = {
  printWelcome,
  checkPermissions,
};
