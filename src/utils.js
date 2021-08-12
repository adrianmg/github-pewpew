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
const PAT_ERROR = `Oops! Check your account details. You can generate a PAT (scoped to 'delete_repo') on ${PAT_URL}`;

function printWelcome() {
  const name = package.name;
  const description = package.description;
  const version = package.version;

  if (name && description && version) {
    console.log(`${style.bold(`${name} v${version}`)}`);
    console.log(description);
    console.log();
  }
}

async function checkPermissions(username, pat) {
  const spinner = ora(`Checking permissions…`);
  spinner.start();

  const curl = `curl -s --head -u ${username}:${pat} ${API_URL}/users/${username} | grep x-oauth-scopes`;
  // TODO: test to check API still retrieves x-oauth-scopes and delete_repo

  try {
    const { stderr, stdout } = await exec(curl);

    if (!stdout.includes('delete_repo')) {
      spinner.fail(PAT_ERROR);

      return false;
    }

    // TODO: store PAT config in system (encrypted with https://www.npmjs.com/package/cryptr) Shall this be a flag and question?
    spinner.succeed(`Permissions OK`);
    return true;
  } catch (error) {
    spinner.fail(PAT_ERROR);

    return false;
  }
}

async function getRepositories(username, pat) {
  const spinner = ora('Fetching repositories…');
  spinner.start();

  const curl = `curl -u ${username}:${pat} ${API_URL}/user/repos?per_page=${API_PAGINATION}&type=owner`;
  const { stdout } = await exec(curl);

  const repos = JSON.parse(stdout);
  const count = repos.length;
  spinner.succeed(
    `${count} ${count > 1 ? 'repositories' : 'repository'} found`
  );

  return repos;
}

async function deleteRepository(username, pat, repo) {
  const spinner = ora(`${style.dim(`${repo}`)}`);
  spinner.start();

  const curl = `curl -I -u ${username}:${pat} -X DELETE ${API_URL}/repos/${repo} | grep HTTP/2`;
  const { stdout } = await exec(curl);
  const status = stdout.split(' ')[1];

  if (status === '204') {
    spinner.stopAndPersist({
      symbol: ``,
      text: `${style.strikethrough.dim(repo)}`,
    });
    return true;
  } else {
    spinner.fail(`${style.dim(`${repo} [ERROR]`)}`);
    return false;
  }
}

module.exports = {
  printWelcome,
  checkPermissions,
  getRepositories,
  deleteRepository,
};
