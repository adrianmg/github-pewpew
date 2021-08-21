const { createOAuthDeviceAuth } = require('@octokit/auth-oauth-device');
const { request } = require('@octokit/request');

// const UI = require('./ui');
const UI = false;
const CLIENT_ID_PROD = 'ed7c193c5b64ee06192a';

const CLIENT_ID = process.env.DEV ? process.env.CLIENT_ID : CLIENT_ID_PROD;
const CLIENT_TYPE = 'oauth-app';
const CLIENT_SCOPES = ['delete_repo', 'repo'];
const API_PAGINATION = 100;

async function auth(onVerificationCode) {
  const auth = createOAuthDeviceAuth({
    clientType: CLIENT_TYPE,
    clientId: CLIENT_ID,
    scopes: CLIENT_SCOPES,
    onVerification: onVerificationCode,
  });

  const { token } = await auth({ type: 'oauth' });
  setToken(token);

  return token;
}

// UI renderGetRepos
// spinner
// res = getRepos()
// res STOP spinner || tantos encontrados
// return res

async function getRepositories() {
  const spinner = UI.printGetRepositoriesStart();

  // apiCall('POST', '/user/repos', {options}, {
  //   headers: {
  //     authorization: getAuthHeader(),
  //   },
  // });

  const res = await request(`GET /user/repos`, {
    headers: { authorization: getAuthHeader() },
    per_page: API_PAGINATION,
  });

  const scopes = res.headers['x-oauth-scopes'];
  const count = res.data.length;
  const repos = res.data;

  if (res.status !== 200 || !checkPermissions(scopes)) {
    // 401 no permisos token no válido (relanza app) o scopes es cuando relanza
    // 403 todo bien pero no puedes borrar este repo no es tuyo/etc
    // throw
    // throw new AuthenticationError(…) o throw new BadScopesError() …
    // throw new Error(‘Reconfigure scopes’)
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
