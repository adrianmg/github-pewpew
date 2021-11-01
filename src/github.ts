import { createOAuthDeviceAuth } from '@octokit/auth-oauth-device';
import { request } from '@octokit/request';
import { OnVerificationCallback } from '@octokit/auth-oauth-device/dist-types/types';
import { RequestError, OctokitResponse } from '@octokit/types';

const CLIENT_ID_PROD = 'ed7c193c5b64ee06192a';

const CLIENT_ID = process.env.DEV ? (process.env.CLIENT_ID as string) : CLIENT_ID_PROD;
const CLIENT_TYPE = 'oauth-app';
const CLIENT_SCOPES = ['delete_repo', 'repo'];
const API_PAGINATION = 100;
const API_AFFILIATION = 'owner, collaborator';

async function auth(onVerificationCode: OnVerificationCallback): Promise<string> {
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

async function getRepositories(): Promise<any[]> {
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

function checkPermissions(authScopes: string[], clientScopes: string[]): boolean {
  if (authScopes.length < clientScopes.length) {
    return false;
  }

  return clientScopes.every((scope) => {
    return authScopes.includes(scope);
  });
}

async function deleteRepository(repository: string): Promise<boolean> {
  const res = await apiCall('DELETE', `/repos/${repository}`);

  if (res.status !== 204) return false;

  return true;
}

function getAuthHeader(): string {
  return `token ${process.env.GITHUB_TOKEN}`;
}

function setToken(token: string): string | false {
  if (!token) return false;

  return (process.env.GITHUB_TOKEN = token);
}

async function apiCall(
  method: 'GET' | 'DELETE',
  endpoint: string,
  page?: number
): Promise<OctokitResponse<any>> {
  const query = `${method} ${endpoint}`;
  const params = {
    headers: { authorization: getAuthHeader() },
    per_page: API_PAGINATION,
    affiliation: API_AFFILIATION,
    page: page,
  };

  try {
    const res = await request(query, params);

    const scopes = res.headers['x-oauth-scopes']?.split(', ') as string[];

    if (!checkPermissions(scopes, CLIENT_SCOPES)) throw new ScopesError();

    return res;
  } catch (error) {
    const status = (error as RequestError).status;

    if (status === 401) throw new AuthError();

    throw error;
  }
}

class AuthError extends Error {
  code: number;

  constructor(message?: string) {
    super(message);
    this.message = message || 'Unauthorized';
    this.code = 401;
  }
}

class ScopesError extends Error {
  constructor(message?: string) {
    super(message);
    this.message = message || 'Client and token scopes missmatch';
  }
}

export {
  auth,
  getRepositories,
  checkPermissions,
  deleteRepository,
  setToken,
  AuthError,
  ScopesError,
};
