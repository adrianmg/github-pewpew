import { createOAuthDeviceAuth } from '@octokit/auth-oauth-device';
import { request } from '@octokit/request';

const CLIENT_ID_PROD = 'ed7c193c5b64ee06192a';

const CLIENT_ID = process.env.DEV ? process.env.CLIENT_ID : CLIENT_ID_PROD;
const CLIENT_TYPE = 'oauth-app';
const CLIENT_SCOPES = ['delete_repo', 'repo', 'codespace'];
const API_PAGINATION = 100;
const API_AFFILIATION = 'owner, collaborator';

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

async function getRepositories() {
  let page = 1;
  const repos = [];

  while (true) {
    const res = await apiCall('GET', '/user/repos', page);
    const reposCurrentPage = res.data;

    if (reposCurrentPage.length === 0) break;

    repos.push(...reposCurrentPage);
    page++;
  }

  return repos;
}

async function getCodespaces() {
  let page = 1;

  const codespaces = [];

  while (true) {
    const res = await apiCall('GET', '/user/codespaces', page);
    const codespacesCurrentPage = res.data.codespaces;

    if (codespacesCurrentPage.length === 0) break;

    codespaces.push(...codespacesCurrentPage);
    page++;
  }

  return codespaces;
}

function checkPermissions(authScopes, clientScopes) {
  if (authScopes.length < clientScopes.length) {
    return false;
  }

  return clientScopes.every((scope) => {
    return authScopes.includes(scope);
  });
}

async function deleteRepository(repository) {
  const res = await apiCall('DELETE', `/repos/${repository}`);

  if (res.status !== 204) return false;

  return true;
}

async function archiveRepository(repository) {
  const res = await apiCall('PATCH', `/repos/${repository}`, undefined, {
    archived: true,
  });

  if (res.status !== 200) return false;

  return true;
}

async function deleteCodespace(codespace) {
  const res = await apiCall('DELETE', `/user/codespaces/${codespace}`);

  if (res.status !== 204) return false;

  return true;
}

function getAuthHeader() {
  return `token ${process.env.GITHUB_TOKEN}`;
}

function setToken(token) {
  if (!token) return false;

  return (process.env.GITHUB_TOKEN = token);
}

async function apiCall(method, endpoint, page, data) {
  const query = `${method} ${endpoint}`;
  const params = {
    headers: { authorization: getAuthHeader() },
    affiliation: API_AFFILIATION,
    per_page: API_PAGINATION,
    page: page,
    ...data,
  };

  try {
    const res = await request(query, params);

    const scopes = res.headers['x-oauth-scopes'].split(', ');

    if (!checkPermissions(scopes, CLIENT_SCOPES)) throw new ScopesError();

    return res;
  } catch (error) {
    if (error.status === 401) throw new AuthError();

    throw error;
  }
}

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.message = message || 'Unauthorized';
    this.code = 401;
  }
}

class ScopesError extends Error {
  constructor(message) {
    super(message);
    this.message = message || 'Client and token scopes missmatch';
  }
}

export default {
  auth,
  getRepositories,
  getCodespaces,
  deleteRepository,
  archiveRepository,
  deleteCodespace,
  AuthError,
  ScopesError,
};
