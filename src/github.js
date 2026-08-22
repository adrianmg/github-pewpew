import { createOAuthDeviceAuth } from '@octokit/auth-oauth-device';
import { request } from '@octokit/request';

const CLIENT_ID_PROD = 'ed7c193c5b64ee06192a';

const CLIENT_ID = process.env.DEV ? process.env.CLIENT_ID : CLIENT_ID_PROD;
const CLIENT_TYPE = 'oauth-app';
const RESOURCE_SCOPES = {
  repositories: ['repo'],
  deleteRepository: ['delete_repo'],
  codespaces: ['codespace'],
  gists: ['gist'],
};
const CLIENT_SCOPES = [...new Set(Object.values(RESOURCE_SCOPES).flat())];
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
    const res = await apiCall(
      'GET',
      '/user/repos',
      page,
      { affiliation: API_AFFILIATION },
      RESOURCE_SCOPES.repositories
    );
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
    const res = await apiCall(
      'GET',
      '/user/codespaces',
      page,
      undefined,
      RESOURCE_SCOPES.codespaces
    );
    const codespacesCurrentPage = res.data.codespaces;

    if (codespacesCurrentPage.length === 0) break;

    codespaces.push(...codespacesCurrentPage);
    page++;
  }

  return codespaces;
}

async function getGists() {
  let page = 1;
  const gists = [];

  while (true) {
    const res = await apiCall('GET', '/gists', page, undefined, RESOURCE_SCOPES.gists);
    const gistsCurrentPage = res.data;

    if (gistsCurrentPage.length === 0) break;

    gists.push(...gistsCurrentPage);
    page++;
  }

  return gists;
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
  await apiCall(
    'DELETE',
    `/repos/${repository}`,
    undefined,
    undefined,
    RESOURCE_SCOPES.deleteRepository
  );

  return true;
}

async function archiveRepository(repository) {
  await apiCall(
    'PATCH',
    `/repos/${repository}`,
    undefined,
    { archived: true },
    RESOURCE_SCOPES.repositories
  );

  return true;
}

async function deleteCodespace(codespace) {
  await apiCall(
    'DELETE',
    `/user/codespaces/${codespace}`,
    undefined,
    undefined,
    RESOURCE_SCOPES.codespaces
  );

  return true;
}

async function deleteGist(gist) {
  await apiCall('DELETE', `/gists/${gist}`, undefined, undefined, RESOURCE_SCOPES.gists);

  return true;
}

function getAuthHeader() {
  return `token ${process.env.GITHUB_TOKEN}`;
}

function setToken(token) {
  if (!token) return false;

  return (process.env.GITHUB_TOKEN = token);
}

async function apiCall(method, endpoint, page, data, requiredScopes = []) {
  const query = `${method} ${endpoint}`;
  const params = {
    headers: { authorization: getAuthHeader() },
    ...data,
  };

  if (page !== undefined) {
    params.per_page = API_PAGINATION;
    params.page = page;
  }

  try {
    const res = await request(query, params);

    const scopes = parseScopes(res.headers) || [];

    if (!checkPermissions(scopes, requiredScopes)) throw new ScopesError();

    return res;
  } catch (error) {
    if (error.status === 401) throw new AuthError();

    const scopes = parseScopes(error.response?.headers);
    if (scopes && !checkPermissions(scopes, requiredScopes)) {
      throw new ScopesError();
    }

    throw error;
  }
}

function parseScopes(headers) {
  const scopes = headers?.['x-oauth-scopes'];
  if (scopes === undefined) return undefined;

  return scopes.split(', ').filter(Boolean);
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
    this.message = message || 'Client and token scopes mismatch';
  }
}

export default {
  auth,
  getRepositories,
  getCodespaces,
  getGists,
  deleteRepository,
  archiveRepository,
  deleteCodespace,
  deleteGist,
  checkPermissions,
  setToken,
  AuthError,
  ScopesError,
};
