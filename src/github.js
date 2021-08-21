const { createOAuthDeviceAuth } = require('@octokit/auth-oauth-device');
const { request } = require('@octokit/request');

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

async function getRepositories() {
  const res = await apiCall('GET', '/user/repos');

  const scopes = res.headers['x-oauth-scopes'];
  const repos = res.data;

  if (!checkPermissions(scopes)) throw new ScopesError();

  return repos;
}

function checkPermissions(authScopes) {
  const currentScopes = authScopes.split(', ');

  if (currentScopes.length < CLIENT_SCOPES.length) {
    return false;
  }

  CLIENT_SCOPES.every((scope) => {
    return currentScopes.includes(scope);
  });
}

async function deleteRepository(repo) {
  const res = await apiCall('DELETE', `/repos/${repo}`);

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

async function apiCall(method, endpoint) {
  const query = `${method} ${endpoint}`;
  const params = {
    headers: { authorization: getAuthHeader() },
    per_page: API_PAGINATION,
  };

  try {
    return await request(query, params);
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

module.exports = {
  auth,
  getRepositories,
  deleteRepository,
  setToken,
  AuthError,
  ScopesError,
};
