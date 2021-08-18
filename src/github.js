const { createOAuthDeviceAuth } = require('@octokit/auth-oauth-device');
const { request } = require('@octokit/request');
const { promisify } = require('util');
const childProcess = require('child_process');
const clipboard = require('clipboardy');

const UI = require('./ui');

const exec = promisify(childProcess.exec);

const CLIENT_ID = process.env.DEV ? process.env.CLIENT_ID : 'ed7c193c5b64ee06192a';
const CLIENT_TYPE = 'oauth-app';
const CLIENT_SCOPES = ['delete_repo', 'repo'];
const API_PAGINATION = 100;

async function auth() {
  const spinner = UI.printAuthStart();

  const auth = createOAuthDeviceAuth({
    clientType: CLIENT_TYPE,
    clientId: CLIENT_ID,
    scopes: CLIENT_SCOPES,
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

  const res = await request(`GET /user/repos`, {
    headers: { authorization: getAuthHeader() },
    per_page: API_PAGINATION,
  });

  const scopes = res.headers['x-oauth-scopes'];
  const count = res.data.length;
  const repos = res.data;

  if (res.status !== 200 || !checkPermissions(scopes)) {
    UI.printNoRepos(spinner);
    UI.printNewLine();

    return false;
  }

  UI.printGetRepositoriesSucceed(spinner, count);

  return repos;
}

function checkPermissions(authScopes) {
  authScopes = authScopes.split(', ');
  authScopes.sort();
  const clientScopes = CLIENT_SCOPES.sort();

  if (authScopes.length !== clientScopes.length) {
    return false;
  }

  for (let i = 0; i < clientScopes.length; i++) {
    if (authScopes[i] !== clientScopes[i]) {
      return false;
    }
  }

  return true;
}

async function deleteRepository(repo) {
  const spinner = UI.printDeleteRepositoryStart(repo);

  const res = await request(`DELETE /repos/${repo}`, {
    headers: { authorization: getAuthHeader() },
  });

  if (res.status === 204) {
    UI.printDeleteRepositorySucceed(spinner, repo);
    return true;
  }

  UI.printDeleteRepositoryFailed(spinner, repo);
  return false;
}

function getAuthHeader() {
  return `token ${process.env.GITHUB_TOKEN}`;
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
