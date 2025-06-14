import { createOAuthDeviceAuth } from '@octokit/auth-oauth-device';
import { request } from '@octokit/request';

let requestFunc = request;

const CLIENT_ID_PROD = 'ed7c193c5b64ee06192a';

const CLIENT_ID = process.env.DEV ? process.env.CLIENT_ID! : CLIENT_ID_PROD;
const CLIENT_TYPE = 'oauth-app';
const CLIENT_SCOPES = ['delete_repo', 'repo', 'codespace'];
const API_PAGINATION = 100;
const API_AFFILIATION = 'owner, collaborator';

export function setRequestFunc(func: typeof request): void {
  requestFunc = func;
}

async function auth(onVerificationCode: (verification: any) => void): Promise<string> {
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

async function getCodespaces(): Promise<any[]> {
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

async function archiveRepository(repository: string): Promise<boolean> {
  const res = await apiCall('PATCH', `/repos/${repository}`, undefined, {
    archived: true,
  });

  if (res.status !== 200) return false;

  return true;
}

async function deleteCodespace(codespace: string): Promise<boolean> {
  const res = await apiCall('DELETE', `/user/codespaces/${codespace}`);

  if (res.status !== 204) return false;

  return true;
}

function getAuthHeader(): string {
  return `token ${process.env.GITHUB_TOKEN}`;
}

function setToken(token: string | undefined): boolean {
  if (!token) return false;

  process.env.GITHUB_TOKEN = token;
  return true;
}

async function apiCall(
  method: string,
  endpoint: string,
  page?: number,
  data: Record<string, any> = {}
): Promise<any> {
  const query = `${method} ${endpoint}`;
  const params = {
    headers: { authorization: getAuthHeader() },
    per_page: API_PAGINATION,
    affiliation: API_AFFILIATION,
    page,
    ...data,
  };

  try {
    const res = await requestFunc(query, params);

    const scopes = String(res.headers['x-oauth-scopes']).split(', ');

    if (!checkPermissions(scopes, CLIENT_SCOPES)) throw new ScopesError();

    return res;
  } catch (error) {
    const err = error as any;
    if (err.status === 401) throw new AuthError();

    throw err;
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

export default {
  auth,
  getRepositories,
  getCodespaces,
  checkPermissions,
  deleteRepository,
  archiveRepository,
  deleteCodespace,
  setToken,
  setRequestFunc,
  AuthError,
  ScopesError,
};
