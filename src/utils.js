const childProcess = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const package = require('../package.json');
const style = require('ansi-colors');
const ora = require('ora');

const exec = promisify(childProcess.exec);

const API_URL = 'https://api.github.com';
const API_PAGINATION = 100;
const PAT_URL = 'https://github.com/settings/tokens';

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
  const spinner = ora(`Checking permissions…`);
  spinner.start();

  const curl = `curl -s --head -u ${username}:${pat} ${API_URL}/users/${username} | grep x-oauth-scopes`;
  // TODO: test to check API still retrieves x-oauth-scopes and delete_repo
  // TODO: prevent and combine into logic the failure from grep when checking permissions

  try {
    const { stderr, stdout } = await exec(curl);

    if (!stdout.includes('delete_repo')) {
      spinner.fail(
        `Oops! Your PAT is missing 'delete_repo' permissions. Generate a new one on ${PAT_URL}`
      );
      process.exit(0);
    }

    // TODO: store PAT config in system (encrypted with https://www.npmjs.com/package/cryptr) Shall this be a flag and question?
    spinner.succeed(`Permissions OK`);
    return true;
  } catch (error) {
    spinner.fail(
      `Oops! Check your account details. You can generate a PAT (scoped to 'delete_repo') on ${PAT_URL}`
    );
    process.exit(0);
  }
}

async function getRepositories(username, pat) {
  const spinner = ora('Fetching repositories…');
  spinner.start();

  const curl = `curl -u ${username}:${pat} ${API_URL}/user/repos?per_page=${API_PAGINATION}&type=owner`;
  const { stdout } = await exec(curl);
  fs.writeFileSync('repos.js', stdout);

  const repos = JSON.parse(stdout);
  const count = repos.length;
  spinner.succeed(
    `${count} ${count > 1 ? 'repositories' : 'repository'} found`
  );

  return repos;
}

module.exports = {
  printWelcome,
  checkPermissions,
  getRepositories,
};
