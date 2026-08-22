import assert from 'assert';
import { describe, it } from 'node:test';

import codespacesCommand from '../src/commands/codespaces.js';
import CommandSummary from '../src/command-summary.js';
import gistsCommand from '../src/commands/gists.js';
import Github from '../src/github.js';
import reposCommand from '../src/commands/repos.js';
import RepoOptions from '../src/repo-options.js';
import UI from '../src/ui.js';
import Utils from '../src/utils.js';

async function withUiStubs(stubs, callback) {
  const originalFunctions = Object.fromEntries(
    Object.keys(stubs).map((name) => [name, UI[name]])
  );
  Object.assign(UI, stubs);

  try {
    return await callback();
  } finally {
    Object.assign(UI, originalFunctions);
  }
}

async function withGithubStubs(stubs, callback) {
  const originalFunctions = Object.fromEntries(
    Object.keys(stubs).map((name) => [name, Github[name]])
  );
  const originalLog = console.log;
  Object.assign(Github, stubs);
  console.log = () => {};

  try {
    return await callback();
  } finally {
    console.log = originalLog;
    Object.assign(Github, originalFunctions);
  }
}

async function withMockGithubFetch(fetchMock, callback) {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.GITHUB_TOKEN;
  globalThis.fetch = fetchMock;
  Github.setToken('test-token');

  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) {
      delete process.env.GITHUB_TOKEN;
    } else {
      process.env.GITHUB_TOKEN = originalToken;
    }
  }
}

function githubResponse(data, status = 200, scopes = 'delete_repo, repo, codespace, gist') {
  return new Response(data === undefined ? null : JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'x-oauth-scopes': scopes,
    },
  });
}

describe('runtime dependencies', () => {
  it('should load the CLI integrations', () => {
    assert.equal(typeof UI.printHelp, 'function');
    assert.equal(typeof Github.getGists, 'function');
    assert.equal(typeof Github.deleteGist, 'function');
  });

  it('should list commands in the preferred order', () => {
    const output = [];
    const originalLog = console.log;
    console.log = (...args) => output.push(args.join(' '));

    try {
      UI.printHelp();
    } finally {
      console.log = originalLog;
    }

    const help = output.join('\n');
    const commandIndexes = [
      help.indexOf('repos [options]'),
      help.indexOf('gists'),
      help.indexOf('codespaces'),
      help.indexOf('help'),
    ];

    assert.deepEqual(commandIndexes, [...commandIndexes].sort((a, b) => a - b));
  });
});

describe('RepoOptions.parse(args)', () => {
  it('should parse repository action and selection options', () => {
    const options = RepoOptions.parse([
      '--archive',
      '--force',
      '--regex',
      '^adrianmg/demo-',
    ]);

    assert.equal(options.archive, true);
    assert.equal(options.force, true);
    assert.equal(options.regex.test('adrianmg/demo-one'), true);
    assert.equal(options.regex.test('other/demo-one'), false);
  });

  it('should parse and trim a comma-separated repository list', () => {
    const options = RepoOptions.parse([
      '--list=AdrianMG/one, adrianmg/two',
      '--force',
    ]);

    assert.deepEqual(options.list, ['AdrianMG/one', 'adrianmg/two']);
    assert.equal(options.force, true);
  });

  it('should reject conflicting, missing, malformed, and unknown options', () => {
    assert.throws(
      () => RepoOptions.parse(['--regex', 'demo', '--list', 'adrianmg/demo']),
      /cannot be used together/
    );
    assert.throws(() => RepoOptions.parse(['--regex']), /requires a value/);
    assert.throws(() => RepoOptions.parse(['--regex', '[']), /Invalid --regex pattern/);
    assert.throws(
      () => RepoOptions.parse(['--list', 'demo']),
      /full owner\/repository name/
    );
    assert.throws(() => RepoOptions.parse(['--unknown']), /Unknown repository option/);
  });
});

describe('RepoOptions.selectRepositories(repositories, options)', () => {
  const repositories = [
    { full_name: 'adrianmg/demo-one' },
    { full_name: 'adrianmg/demo-two' },
    { full_name: 'other/example' },
  ];

  it('should select repository names matching a regex', () => {
    const options = RepoOptions.parse(['--regex', '^adrianmg/demo-']);

    assert.deepEqual(RepoOptions.selectRepositories(repositories, options), [
      'adrianmg/demo-one',
      'adrianmg/demo-two',
    ]);
  });

  it('should select listed repositories case-insensitively and remove duplicates', () => {
    const options = RepoOptions.parse([
      '--list',
      'OTHER/example,adrianmg/demo-one,other/EXAMPLE',
    ]);

    assert.deepEqual(RepoOptions.selectRepositories(repositories, options), [
      'other/example',
      'adrianmg/demo-one',
    ]);
  });

  it('should abort when any listed repository is unavailable', () => {
    const options = RepoOptions.parse([
      '--list',
      'adrianmg/demo-one,adrianmg/missing',
    ]);

    assert.throws(
      () => RepoOptions.selectRepositories(repositories, options),
      /Repositories not found: adrianmg\/missing/
    );
  });
});

describe('reposCommand(options)', () => {
  const repositories = [
    { full_name: 'adrianmg/demo-one' },
    { full_name: 'adrianmg/demo-two' },
  ];

  it('should require confirmation for a filtered selection by default', async () => {
    let archived = false;
    let confirmation;
    const options = RepoOptions.parse(['--archive', '--regex', 'demo']);

    await withUiStubs(
      {
        getRepositories: async () => repositories,
        printReposMatched: () => {},
        promptConfirm: async (...args) => {
          confirmation = args;
          return { confirm: 'Cancel' };
        },
        printNoReposArchived: () => {},
        archiveRepositories: async () => {
          archived = true;
        },
      },
      async () => reposCommand(options)
    );

    assert.deepEqual(confirmation, [2, 'repos', 'archive']);
    assert.equal(archived, false);
  });

  it('should skip confirmation when force is enabled', async () => {
    let deletedRepositories;
    const options = RepoOptions.parse([
      '--list',
      'adrianmg/demo-two',
      '--force',
    ]);

    await withUiStubs(
      {
        getRepositories: async () => repositories,
        printReposMatched: () => {},
        promptConfirm: async () => assert.fail('confirmation should be skipped'),
        deleteRepositories: async (selectedRepositories) => {
          deletedRepositories = selectedRepositories;
        },
      },
      async () => reposCommand(options)
    );

    assert.deepEqual(deletedRepositories, ['adrianmg/demo-two']);
  });

  it('should stop when a regex matches no repositories', async () => {
    let reportedNoMatches = false;
    const options = RepoOptions.parse(['--regex', '^missing/']);

    await withUiStubs(
      {
        getRepositories: async () => repositories,
        printNoReposMatched: () => {
          reportedNoMatches = true;
        },
        promptConfirm: async () => assert.fail('confirmation should not be shown'),
        deleteRepositories: async () => assert.fail('repositories should not be deleted'),
      },
      async () => reposCommand(options)
    );

    assert.equal(reportedNoMatches, true);
  });

  it('should propagate repository listing failures without processing repositories', async () => {
    const listingError = new Error('Internal Server Error');
    const options = RepoOptions.parse(['--list', 'adrianmg/demo-one', '--force']);

    await withUiStubs(
      {
        getRepositories: async () => {
          throw listingError;
        },
        promptSelectRepositories: async () =>
          assert.fail('repositories should not be selected'),
        deleteRepositories: async () => assert.fail('repositories should not be deleted'),
      },
      async () => {
        await assert.rejects(reposCommand(options), (error) => error === listingError);
      }
    );
  });

  it('should return the deletion summary reported by the UI', async () => {
    const summary = { processed: ['adrianmg/demo-two'], failed: [] };
    const options = RepoOptions.parse(['--list', 'adrianmg/demo-two', '--force']);

    const result = await withUiStubs(
      {
        getRepositories: async () => repositories,
        printReposMatched: () => {},
        deleteRepositories: async () => summary,
      },
      async () => reposCommand(options)
    );

    assert.deepEqual(result, summary);
  });
});

describe('gistsCommand()', () => {
  const gists = [
    { id: 'gist-one', description: 'First gist' },
    { id: 'gist-two', description: 'Second gist' },
  ];

  it('should delete selected gists after confirmation', async () => {
    let confirmation;
    let deletedGists;

    await withUiStubs(
      {
        getGists: async () => gists,
        promptSelectGists: async () => ({ gists: ['gist-two'] }),
        promptConfirm: async (...args) => {
          confirmation = args;
          return { confirm: 'Yes' };
        },
        deleteGists: async (selectedGists) => {
          deletedGists = selectedGists;
        },
      },
      gistsCommand
    );

    assert.deepEqual(confirmation, [1, 'gists', 'delete']);
    assert.deepEqual(deletedGists, ['gist-two']);
  });

  it('should preserve selected gists when confirmation is cancelled', async () => {
    let cancellationReported = false;

    await withUiStubs(
      {
        getGists: async () => gists,
        promptSelectGists: async () => ({ gists: ['gist-one'] }),
        promptConfirm: async () => ({ confirm: 'Cancel' }),
        deleteGists: async () => assert.fail('gists should not be deleted'),
        printNoGistsDeleted: () => {
          cancellationReported = true;
        },
      },
      gistsCommand
    );

    assert.equal(cancellationReported, true);
  });

  it('should stop when no gists are selected', async () => {
    let emptySelectionReported = false;

    await withUiStubs(
      {
        getGists: async () => gists,
        promptSelectGists: async () => ({ gists: [] }),
        promptConfirm: async () => assert.fail('confirmation should not be shown'),
        printNoGistSelected: () => {
          emptySelectionReported = true;
        },
      },
      gistsCommand
    );

    assert.equal(emptySelectionReported, true);
  });
});

describe('codespacesCommand()', () => {
  it('should use the shared deletion confirmation response', async () => {
    let confirmation;
    let deletedCodespaces;

    await withUiStubs(
      {
        getCodespaces: async () => [{ name: 'codespace-one' }],
        promptSelectCodespaces: async () => ({ codespaces: ['codespace-one'] }),
        promptConfirm: async (...args) => {
          confirmation = args;
          return { confirm: 'Yes' };
        },
        deleteCodespaces: async (selectedCodespaces) => {
          deletedCodespaces = selectedCodespaces;
        },
      },
      codespacesCommand
    );

    assert.deepEqual(confirmation, [1, 'codespaces', 'delete']);
    assert.deepEqual(deletedCodespaces, ['codespace-one']);
  });

  it('should propagate codespace listing failures', async () => {
    const listingError = new Error('Network request failed');

    await withUiStubs(
      {
        getCodespaces: async () => {
          throw listingError;
        },
        promptSelectCodespaces: async () =>
          assert.fail('codespaces should not be selected'),
        deleteCodespaces: async () => assert.fail('codespaces should not be deleted'),
      },
      async () => {
        await assert.rejects(codespacesCommand(), (error) => error === listingError);
      }
    );
  });

  it('should return the deletion summary reported by the UI', async () => {
    const summary = { processed: [], failed: ['codespace-one'] };

    const result = await withUiStubs(
      {
        getCodespaces: async () => [{ name: 'codespace-one' }],
        promptSelectCodespaces: async () => ({ codespaces: ['codespace-one'] }),
        promptConfirm: async () => ({ confirm: 'Yes' }),
        deleteCodespaces: async () => summary,
      },
      codespacesCommand
    );

    assert.deepEqual(result, summary);
  });
});

describe('UI mutation batches', () => {
  it('should report a failed repository and keep processing the batch', async () => {
    const attempts = [];
    const failure = new Error('Request failed');
    failure.response = { data: { message: 'Must have admin rights' } };

    const summary = await withGithubStubs(
      {
        deleteRepository: async (repository) => {
          attempts.push(repository);
          if (repository === 'adrianmg/demo-two') throw failure;

          return true;
        },
      },
      async () =>
        UI.deleteRepositories([
          'adrianmg/demo-one',
          'adrianmg/demo-two',
          'adrianmg/demo-three',
        ])
    );

    assert.deepEqual(attempts, [
      'adrianmg/demo-one',
      'adrianmg/demo-two',
      'adrianmg/demo-three',
    ]);
    assert.deepEqual(summary.processed, ['adrianmg/demo-one', 'adrianmg/demo-three']);
    assert.deepEqual(summary.failed, ['adrianmg/demo-two']);
    assert.equal(summary.authError, undefined);
  });

  it('should abort the batch on a token-wide failure without throwing', async () => {
    const attempts = [];
    const scopesError = new Github.ScopesError();

    const summary = await withGithubStubs(
      {
        deleteCodespace: async (codespace) => {
          attempts.push(codespace);
          if (codespace === 'codespace-two') throw scopesError;

          return true;
        },
      },
      async () =>
        UI.deleteCodespaces(['codespace-one', 'codespace-two', 'codespace-three'])
    );

    assert.deepEqual(attempts, ['codespace-one', 'codespace-two']);
    assert.deepEqual(summary.processed, ['codespace-one']);
    assert.deepEqual(summary.failed, ['codespace-two']);
    assert.equal(summary.authError, scopesError);
  });
});

describe('CommandSummary.resolveOutcome(summary)', () => {
  it('should keep a successful exit status and cached credentials', () => {
    assert.deepEqual(CommandSummary.resolveOutcome(CommandSummary.create()), {
      invalidateConfig: false,
      exitCode: 0,
    });
    assert.deepEqual(CommandSummary.resolveOutcome(undefined), {
      invalidateConfig: false,
      exitCode: 0,
    });
  });

  it('should fail the process when any mutation failed', () => {
    assert.deepEqual(
      CommandSummary.resolveOutcome({ processed: ['one'], failed: ['two'] }),
      { invalidateConfig: false, exitCode: 1 }
    );
  });

  it('should invalidate cached credentials after a token-wide failure', () => {
    assert.deepEqual(
      CommandSummary.resolveOutcome({
        processed: [],
        failed: ['one'],
        authError: new Github.AuthError(),
      }),
      { invalidateConfig: true, exitCode: 1 }
    );
  });
});

describe('Utils.uiGetLabel(type, count)', () => {
  it('should format gist and repository labels', () => {
    assert.equal(Utils.uiGetLabel('gists', 1), 'gist');
    assert.equal(Utils.uiGetLabel('gists', 2), 'gists');
    assert.equal(Utils.uiGetLabel('repos', 2), 'repositories');
  });
});

describe('Github gist API', () => {
  it('should fetch every gist page with the authenticated endpoint', async () => {
    const requests = [];
    const pages = [[{ id: 'gist-one' }], [{ id: 'gist-two' }], []];

    await withMockGithubFetch(
      async (url, options) => {
        const requestUrl = new URL(url);
        const page = Number(requestUrl.searchParams.get('page'));
        requests.push({ url: requestUrl, method: options.method });
        return githubResponse(pages[page - 1]);
      },
      async () => {
        assert.deepEqual(await Github.getGists(), [
          { id: 'gist-one' },
          { id: 'gist-two' },
        ]);
      }
    );

    assert.deepEqual(
      requests.map(({ url, method }) => ({
        method,
        pathname: url.pathname,
        page: url.searchParams.get('page'),
        perPage: url.searchParams.get('per_page'),
        affiliation: url.searchParams.get('affiliation'),
      })),
      [
        {
          method: 'GET',
          pathname: '/gists',
          page: '1',
          perPage: '100',
          affiliation: null,
        },
        {
          method: 'GET',
          pathname: '/gists',
          page: '2',
          perPage: '100',
          affiliation: null,
        },
        {
          method: 'GET',
          pathname: '/gists',
          page: '3',
          perPage: '100',
          affiliation: null,
        },
      ]
    );
  });

  it('should delete a gist by ID without unrelated query parameters', async () => {
    let request;

    await withMockGithubFetch(
      async (url, options) => {
        request = { url: new URL(url), method: options.method };
        return githubResponse(undefined, 204);
      },
      async () => {
        assert.equal(await Github.deleteGist('gist-one'), true);
      }
    );

    assert.equal(request.method, 'DELETE');
    assert.equal(request.url.pathname, '/gists/gist-one');
    assert.equal(request.url.search, '');
  });

  it('should reject tokens without the gist OAuth scope', async () => {
    await withMockGithubFetch(
      async () =>
        githubResponse([], 200, 'delete_repo, repo, codespace'),
      async () => {
        await assert.rejects(Github.getGists(), Github.ScopesError);
      }
    );
  });
});

describe('Github mutation requests', () => {
  it('should accept the accepted status returned by codespace deletion', async () => {
    let request;

    await withMockGithubFetch(
      async (url, options) => {
        request = { url: new URL(url), method: options.method };
        return githubResponse({}, 202);
      },
      async () => {
        assert.equal(await Github.deleteCodespace('codespace-one'), true);
      }
    );

    assert.equal(request.method, 'DELETE');
    assert.equal(request.url.pathname, '/user/codespaces/codespace-one');
  });

  it('should map an unauthorized response to an authentication error', async () => {
    await withMockGithubFetch(
      async () => githubResponse({ message: 'Bad credentials' }, 401),
      async () => {
        await assert.rejects(
          Github.deleteRepository('adrianmg/example'),
          Github.AuthError
        );
      }
    );
  });

  it('should preserve a generic error when the request never reaches GitHub', async () => {
    const networkError = new TypeError('fetch failed');

    await withMockGithubFetch(
      async () => {
        throw networkError;
      },
      async () => {
        await assert.rejects(Github.deleteRepository('adrianmg/example'), (error) => {
          assert.equal(error instanceof Github.AuthError, false);
          assert.equal(error instanceof Github.ScopesError, false);
          assert.match(error.message, /fetch failed/);

          return true;
        });
      }
    );
  });

  it('should accept a successful DELETE response with status 204 and no x-oauth-scopes header', async () => {
    await withMockGithubFetch(
      async () => new Response(null, { status: 204 }),
      async () => {
        assert.equal(await Github.deleteRepository('adrianmg/example'), true);
      }
    );
  });
});

describe('Github endpoint permissions', () => {
  it('should not require unrelated Codespaces access to list repositories', async () => {
    await withMockGithubFetch(
      async () => githubResponse([], 200, 'delete_repo, gist, repo'),
      async () => {
        assert.deepEqual(await Github.getRepositories(), []);
      }
    );
  });

  it('should accept a gist-only token for gist listing', async () => {
    await withMockGithubFetch(
      async () => githubResponse([], 200, 'gist'),
      async () => {
        assert.deepEqual(await Github.getGists(), []);
      }
    );
  });

  it('should still require delete_repo when deleting a repository', async () => {
    await withMockGithubFetch(
      async () => githubResponse(undefined, 204, 'gist, repo'),
      async () => {
        await assert.rejects(
          Github.deleteRepository('adrianmg/example'),
          Github.ScopesError
        );
      }
    );
  });
});

describe('Github.checkPermissions(authScopes, clientScopes)', () => {
  it('should return true if authScopes and clientScopes contain the same scopes in the SAME order', () => {
    const authScopes = ['delete_repo', 'repo', 'codespace'];
    const clientScopes = ['delete_repo', 'repo', 'codespace'];

    assert.equal(true, Github.checkPermissions(authScopes, clientScopes));
  });

  it('should return true if authScopes and clientScopes contain the same scopes in a DIFFERENT order', () => {
    const authScopes = ['delete_repo', 'codespace', 'repo'];
    const clientScopes = ['repo', 'delete_repo', 'codespace'];

    assert.equal(true, Github.checkPermissions(authScopes, clientScopes));
  });

  it('should return true if authScopes has MORE scopes than clientScopes but contains the subset from clientScopes in a DIFFERENT order', () => {
    const authScopes = ['delete_repo', 'repo', 'codespace', 'gist'];
    const clientScopes = ['repo', 'delete_repo', 'codespace'];

    assert.equal(true, Github.checkPermissions(authScopes, clientScopes));
  });

  it('should return true if authScopes has MORE scopes than clientScopes but contains the subset from clientScopes in the SAME order', () => {
    const authScopes = ['delete_repo', 'repo', 'codespace', 'gist'];
    const clientScopes = ['delete_repo', 'repo', 'codespace'];

    assert.equal(true, Github.checkPermissions(authScopes, clientScopes));
  });

  it('should return false if authScopes has FEWER scopes than clientScopes', () => {
    const authScopes = ['delete_repo', 'repo'];
    const clientScopes = ['repo', 'delete_repo', 'gist'];

    assert.equal(false, Github.checkPermissions(authScopes, clientScopes));
  });

  it('should return false if authScopes and clientScopes have the SAME AMOUNT but DIFFERENT scopes', () => {
    const authScopes = ['delete_repo', 'repo', 'gist'];
    const clientScopes = ['repo', 'delete_repo', 'user'];

    assert.equal(false, Github.checkPermissions(authScopes, clientScopes));
  });
});
