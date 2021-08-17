const { createOAuthDeviceAuth } = require('@octokit/auth-oauth-device');
const { promisify } = require('util');
const childProcess = require('child_process');
const clipboard = require('clipboardy');

const UI = require('./ui');

const exec = promisify(childProcess.exec);

const CLIENT_ID = 'ed7c193c5b64ee06192a';
const CLIENT_TYPE = 'oauth-app';
const SCOPE = 'delete_repo';
const API_URL = 'https://api.github.com';
const API_PAGINATION = 100;

async function auth() {
  const spinner = UI.printAuthStart();

  const auth = createOAuthDeviceAuth({
    clientType: CLIENT_TYPE,
    clientId: CLIENT_ID,
    scopes: [SCOPE],
    async onVerification(verification) {
      UI.requestToken(spinner, verification);

      clipboard.writeSync(verification.user_code);
    },
  });

  const { token } = await auth({ type: 'oauth' });
  setToken(token);

  UI.printAuthFinished(spinner);

  return token;
}

async function getRepositories() {
  const spinner = UI.printGetRepositoriesStart();

  const curl = `curl ${getAuthHeader()} ${API_URL}/user/repos?per_page=${API_PAGINATION}`;

  const { stdout } = await exec(curl);

  const repos = JSON.parse(stdout);
  const count = repos.length;

  if (!count || count < 1) {
    UI.printNoRepos(spinner);
    process.exit();
  }

  UI.printGetRepositoriesSucceed(spinner, count);

  return repos;
}

async function deleteRepository(repo) {
  const spinner = UI.printDeleteRepositoryStart(repo);

  const curl = `curl -I ${getAuthHeader()} -X DELETE ${API_URL}/repos/${repo} | grep HTTP/2`;
  const { stdout } = await exec(curl);
  const status = stdout.split(' ')[1];

  if (status !== '204') {
    UI.printDeleteRepositoryFailed(spinner, repo);
    return false;
  }

  UI.printDeleteRepositorySucceed(spinner, repo);

  return true;
}

function getAuthHeader() {
  return `-H "Authorization: token ${process.env.GITHUB_TOKEN}"`;
}

function setToken(token) {
  if (!token) return false;

  process.env.GITHUB_TOKEN = token;
  return true;
}

module.exports = {
  auth,
  getRepositories,
  deleteRepository,
  setToken,
};
