const childProcess = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const package = require('../package.json');
const style = require('ansi-colors');
const ora = require('ora');

const exec = promisify(childProcess.exec);

const API_URL = 'https://api.github.com';
const API_PAGINATION = 100;

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

function getAuth() {
  return `-H "Authorization: token ${process.env.GITHUB_TOKEN}"`;
}

async function getRepositories() {
  console.log();
  const spinner = ora('Fetching repositories…');
  spinner.start();

  const curl = `curl ${getAuth()} ${API_URL}/user/repos?per_page=${API_PAGINATION}`;
  const { stdout } = await exec(curl);

  const repos = JSON.parse(stdout);
  const count = repos.length;
  spinner.succeed(`${count} ${count > 1 ? 'repositories' : 'repository'} found`);

  return repos;
}

async function deleteRepository(token, repo) {
  const spinner = ora(`${style.dim(`${repo}`)}`);
  spinner.start();

  const curl = `curl ${getAuth} -X DELETE ${API_URL}/repos/${repo} | grep HTTP/2`;
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
  getRepositories,
  deleteRepository,
};
