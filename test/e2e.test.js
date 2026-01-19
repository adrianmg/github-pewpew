import assert from 'assert';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const fixturePath = path.join(process.cwd(), 'test', 'fixtures', 'github.json');

const createConfigDir = () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ghpew-'));
  const configDir = path.join(tempRoot, 'config');
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    path.join(configDir, 'auth.json'),
    JSON.stringify({ _: 'test', token: 'test-token' }),
    'utf8'
  );

  return { tempRoot, configDir };
};

describe('CLI end-to-end flows', function () {
  this.timeout(15000);

  let configDir;
  let tempRoot;

  before(() => {
    ({ tempRoot, configDir } = createConfigDir());
  });

  after(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  const runCli = async (args, envOverrides = {}) => {
    const { stdout } = await execFileAsync('bun', ['index.js', ...args], {
      env: {
        ...process.env,
        GHPEW_TEST_MODE: 'true',
        GHPEW_FIXTURE_FILE: fixturePath,
        GHPEW_CONFIG_DIR: configDir,
        GITHUB_TOKEN: 'test-token',
        ...envOverrides,
      },
    });

    return stdout;
  };

  it('deletes selected repositories', async () => {
    const output = await runCli(['repos'], {
      GHPEW_TEST_REPOS: 'octo/alpha',
      GHPEW_TEST_CONFIRM: 'yes',
    });

    assert.match(output, /pew pew!/i);
    assert.match(output, /octo\/alpha/);
    assert.match(output, /deleted successfully/);
  });

  it('archives selected repositories', async () => {
    const output = await runCli(['repos', '--archive'], {
      GHPEW_TEST_REPOS: 'octo/beta',
      GHPEW_TEST_CONFIRM: 'yes',
    });

    assert.match(output, /pew pew!/i);
    assert.match(output, /octo\/beta/);
    assert.match(output, /archived successfully/);
  });

  it('deletes selected codespaces', async () => {
    const output = await runCli(['codespaces'], {
      GHPEW_TEST_CODESPACES: 'codespace-alpha',
      GHPEW_TEST_CONFIRM: 'yes',
    });

    assert.match(output, /pew pew!/i);
    assert.match(output, /codespace-alpha/);
    assert.match(output, /deleted successfully/);
  });
});
