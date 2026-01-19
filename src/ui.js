import style from 'ansi-colors';
import clipboard from 'clipboardy';
import React, { useEffect, useMemo, useState } from 'react';

import { createCliRenderer } from '@opentui/core';
import { createRoot, useKeyboard } from '@opentui/react';

import Utils from './utils.js';
import Github from './github.js';

const PACKAGE = Utils.getPackageDetails().package;
const PACKAGE_COMMAND = Object.keys(Utils.getPackageDetails().package.bin)[0];
const TEST_MODE = process.env.GHPEW_TEST_MODE === 'true';
const h = React.createElement;

const PROMPT_FOOTER = "↑/↓ move · space select · enter confirm · esc cancel";

function printWelcome() {
  const name = PACKAGE.name;
  const description = PACKAGE.description;
  const version = PACKAGE.version;

  if (name && description && version) {
    console.log(`${style.bold(`${name} v${version}`)}`);
    console.log(description);
    console.log();
  }
}

function printHelp() {
  printHelpHeader('Usage');
  printHelpUsage();

  console.log();

  printHelpHeader('Commands');
  printHelpCommand('codespaces', 'Delete codespaces');
  printHelpCommand('repos [--archive]', 'Delete or optionally archive repositories');
  printHelpCommand('help', 'Show help');

  console.log();
}

function printHelpUsage() {
  const command = PACKAGE_COMMAND;
  const spacing = Utils.uiHelpGetSpacing();

  console.log(`${spacing}${command} <command>`);
}

function printHelpHeader(text) {
  const header = text.toUpperCase();
  console.log(style.bold(header));
}

function printHelpCommand(command, description) {
  const spacing = Utils.uiHelpGetSpacing();
  const PADDING = 25;
  const paddedCommand = `${command}:`.padEnd(PADDING, ' ');

  console.log(`${spacing}${paddedCommand}${description}`);
}

async function runPrompt(renderPrompt) {
  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
    useAlternateScreen: true,
    useConsole: false,
  });
  const root = createRoot(renderer);

  return await new Promise((resolve) => {
    let resolved = false;

    const finish = (value) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
      renderer.destroy();
    };

    root.render(renderPrompt({ finish }));
  });
}

function formatList(lines) {
  return lines.join('\n');
}

function buildSelectionLines(items, selected, cursorIndex) {
  return items.map((item, index) => {
    const active = index === cursorIndex;
    const cursor = active ? '❯' : ' ';
    const checkbox = selected.has(item.value) ? '[x]' : '[ ]';
    const suffix = item.meta ? ` ${item.meta}` : '';

    return `${cursor} ${checkbox} ${item.label}${suffix}`;
  });
}

function MultiSelectPrompt({ title, items, onSubmit, onCancel, footer }) {
  const [cursorIndex, setCursorIndex] = useState(0);
  const [selected, setSelected] = useState(new Set());

  const lines = useMemo(
    () => buildSelectionLines(items, selected, cursorIndex),
    [items, selected, cursorIndex]
  );

  useKeyboard((key) => {
    if (key.name === 'up' || key.name === 'k') {
      setCursorIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
    }

    if (key.name === 'down' || key.name === 'j') {
      setCursorIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
    }

    if (key.name === 'home') {
      setCursorIndex(0);
    }

    if (key.name === 'end') {
      setCursorIndex(items.length - 1);
    }

    if (key.name === 'space') {
      const value = items[cursorIndex]?.value;

      if (value) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(value)) {
            next.delete(value);
          } else {
            next.add(value);
          }
          return next;
        });
      }
    }

    if (key.name === 'return') {
      onSubmit(Array.from(selected));
    }

    if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
      onCancel();
    }
  });

  return h(
    'box',
    { border: true, title, padding: 1, flexDirection: 'column' },
    h('text', { content: formatList(lines) }),
    h('text', { content: footer || PROMPT_FOOTER, fg: '#8b8b8b' })
  );
}

function SingleSelectPrompt({ title, options, onSubmit, onCancel, footer }) {
  const [cursorIndex, setCursorIndex] = useState(0);

  const lines = useMemo(
    () =>
      options.map((option, index) => {
        const cursor = index === cursorIndex ? '❯' : ' ';
        return `${cursor} ${option.label}`;
      }),
    [cursorIndex, options]
  );

  useKeyboard((key) => {
    if (key.name === 'up' || key.name === 'k') {
      setCursorIndex((prev) => (prev === 0 ? options.length - 1 : prev - 1));
    }

    if (key.name === 'down' || key.name === 'j') {
      setCursorIndex((prev) => (prev === options.length - 1 ? 0 : prev + 1));
    }

    if (key.name === 'return') {
      onSubmit(options[cursorIndex]);
    }

    if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
      onCancel();
    }
  });

  return h(
    'box',
    { border: true, title, padding: 1, flexDirection: 'column' },
    h('text', { content: formatList(lines) }),
    h('text', { content: footer || '↑/↓ move · enter confirm · esc cancel', fg: '#8b8b8b' })
  );
}

function AuthPrompt({ state }) {
  const lines = [state.intro];

  if (state.url) {
    lines.push(`Open: ${state.url}`);
  }

  if (state.code) {
    lines.push(`Code: ${state.code}${state.copied ? ' (copied to clipboard)' : ''}`);
  }

  if (state.status) {
    lines.push(state.status);
  }

  return h(
    'box',
    { border: true, title: 'Sign in to GitHub', padding: 1, flexDirection: 'column' },
    h('text', { content: formatList(lines) })
  );
}

function parseListSelection(envValue, fallbackValues) {
  if (!envValue) {
    return fallbackValues;
  }

  return envValue
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function promptAuth() {
  if (TEST_MODE) {
    const token = process.env.GITHUB_TOKEN || 'fixture-token';
    return token;
  }

  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
    useAlternateScreen: true,
    useConsole: false,
  });
  const root = createRoot(renderer);
  let setViewState;
  let pendingState;

  const updateState = (nextState) => {
    if (setViewState) {
      setViewState(nextState);
    } else {
      pendingState = nextState;
    }
  };

  function AuthApp() {
    const [state, setState] = useState({
      intro: 'Waiting for GitHub device verification…',
      status: 'Follow the instructions below to authenticate.',
      url: '',
      code: '',
      copied: false,
    });

    useEffect(() => {
      setViewState = setState;
      if (pendingState) {
        setState(pendingState);
      }
    }, []);

    return h(AuthPrompt, { state });
  }

  root.render(h(AuthApp));

  const token = await Github.auth((verification) => {
    updateState({
      intro: 'Authorize this app in your browser.',
      status: 'Waiting for GitHub authorization…',
      url: verification.verification_uri,
      code: verification.user_code,
      copied: true,
    });

    clipboard.writeSync(verification.user_code);
  });

  renderer.destroy();
  console.log();

  return token;
}

async function promptSelectRepositories(repositories) {
  try {
    if (repositories.length === 0) throw new Error('No repositories');

    if (TEST_MODE) {
      const fallback = repositories.map((repo) => repo.full_name);
      return { repos: parseListSelection(process.env.GHPEW_TEST_REPOS, fallback) };
    }

    const items = repositories.map((repo) => ({
      label: repo.full_name,
      value: repo.full_name,
      meta: repo.archived ? '(archived)' : '',
    }));

    const repos = await runPrompt(({ finish }) =>
      h(MultiSelectPrompt, {
        title: 'Select repositories you want to process',
        items,
        onSubmit: finish,
        onCancel: () => finish([]),
      })
    );

    return { repos };
  } catch (error) {
    return { repos: [] };
  }
}

async function promptSelectCodespaces(codespaces) {
  try {
    if (codespaces.length === 0) throw new Error('No codespaces');

    if (TEST_MODE) {
      const fallback = codespaces.map((codespace) => codespace.name);
      return { codespaces: parseListSelection(process.env.GHPEW_TEST_CODESPACES, fallback) };
    }

    const items = codespaces.map((codespace) => ({
      label: codespace.name,
      value: codespace.name,
    }));

    const selections = await runPrompt(({ finish }) =>
      h(MultiSelectPrompt, {
        title: 'Select codespaces you want to delete',
        items,
        onSubmit: finish,
        onCancel: () => finish([]),
      })
    );

    return { codespaces: selections };
  } catch (error) {
    return { codespaces: [] };
  }
}

async function getRepositories() {
  const strMessage = `Fetching repositories…`;
  console.log(style.dim(strMessage));

  try {
    const repositories = await Github.getRepositories();

    const count = repositories.length;
    const strSucceed = printReposFound(count);
    console.log(style.dim(strSucceed));

    return repositories;
  } catch (error) {
    if (error instanceof Github.AuthError || error instanceof Github.ScopesError) {
      throw error;
    }
  }
}

async function getCodespaces() {
  const strMessage = `Fetching codespaces…`;
  console.log(style.dim(strMessage));

  try {
    const codespaces = await Github.getCodespaces();

    const count = codespaces.length;
    const strSucceed = printCodespacesFound(count);
    console.log(style.dim(strSucceed));

    return codespaces;
  } catch (error) {
    if (error instanceof Github.AuthError || error instanceof Github.ScopesError) {
      throw error;
    }
  }
}

function printReposFound(count) {
  const strMessage = `${count} ${count > 1 ? 'repositories' : 'repository'} found.`;

  return strMessage;
}

function printCodespacesFound(count) {
  const strMessage = `${count} ${count > 1 ? 'codespaces' : 'codespace'} found.`;

  return strMessage;
}

async function deleteRepositories(repositories) {
  const deletedRepos = [];

  for (const repo of repositories) {
    try {
      await Github.deleteRepository(repo);
      deletedRepos.push(repo);

      console.log(style.strikethrough.dim(repo));
    } catch (error) {
      const message = error.response?.data?.message;

      console.log(style.dim(`${repo} (Oops! ${message})`));
    }
  }

  if (deletedRepos.length > 0) {
    printConfirmation(deletedRepos, 'repos', 'delete');
  } else {
    printNoReposDeleted();
  }
}

async function archiveRepositories(repositories) {
  const archivedRepos = [];

  for (const repo of repositories) {
    try {
      await Github.archiveRepository(repo);
      archivedRepos.push(repo);

      console.log(style.dim(repo));
    } catch (error) {
      const message = error.response?.data?.message;

      console.log(style.dim(`${repo} (Oops! ${message})`));
    }
  }

  if (archivedRepos.length > 0) {
    printConfirmation(archivedRepos, 'repos', 'archive');
  } else {
    printNoReposArchived();
  }
}

async function deleteCodespaces(codespaces) {
  const deletedCodespaces = [];

  for (const codespace of codespaces) {
    try {
      await Github.deleteCodespace(codespace);
      deletedCodespaces.push(codespace);

      console.log(style.strikethrough.dim(codespace));
    } catch (error) {
      const message = error.response?.data?.message;

      console.log(style.dim(`${codespace} (Oops! ${message})`));
    }
  }

  if (deletedCodespaces.length > 0) {
    printConfirmation(deletedCodespaces, 'codespaces', 'delete');
  } else {
    printNoCodespacesDeleted();
  }
}

async function promptConfirm(count, type, action) {
  const capitalizedAction = action.charAt(0).toUpperCase() + action.slice(1);

  if (TEST_MODE) {
    const confirm = process.env.GHPEW_TEST_CONFIRM?.toLowerCase() === 'no' ? 'No' : 'Yes';
    return { confirm };
  }

  const options = [
    {
      label: `Yes, ${action} ${Utils.uiGetLabel(type, count)} (${count})`,
      value: 'Yes',
    },
    {
      label: 'Cancel',
      value: 'No',
    },
  ];

  const selection = await runPrompt(({ finish }) =>
    h(SingleSelectPrompt, {
      title: `${capitalizedAction} confirmation`,
      options,
      onSubmit: finish,
      onCancel: () => finish(options[1]),
    })
  );

  return { confirm: selection?.value || 'No' };
}

function printConfirmation(processedItems, type, action) {
  const count = processedItems.length;

  const strProcessedItems = count > 1 ? processedItems.join(', ') : processedItems[0];
  const strItems = Utils.uiGetLabel(type, count);
  const pastTenseAction = action === 'delete' ? 'deleted' : 'archived';
  const strConfirm = `🔫 pew pew! ${count} ${strItems} ${pastTenseAction} successfully: ${strProcessedItems}`;
  const strRecover = `Recover repositories from github.com/settings/repositories`;

  console.log(strConfirm);
  if (type === 'repos' && action === 'delete') {
    console.log(style.dim(strRecover));
  }

  return true;
}

function printNoReposArchived() {
  const strMessage = `Rest assured, no repositories were archived.`;

  return console.log(style.dim(strMessage));
}

function printNoReposDeleted() {
  const strMessage = `Rest assured, no repositories were deleted.`;

  return console.log(style.dim(strMessage));
}

function printNoCodespacesDeleted() {
  const strMessage = `Rest assured, no codespaces were deleted.`;

  return console.log(style.dim(strMessage));
}

function printNoReposSelected() {
  const strMessage = `No repositories selected. (Press 'space' to select)`;

  return console.log(style.dim(strMessage));
}

function printNoCodespaceSelected() {
  const strMessage = `No codespaces selected. (Press 'space' to select)`;

  return console.log(style.dim(strMessage));
}

function printError(strError) {
  console.log();
  return console.log(style.redBright(strError));
}

export default {
  printWelcome,
  printHelp,
  promptAuth,
  getRepositories,
  getCodespaces,
  promptSelectRepositories,
  promptSelectCodespaces,
  deleteRepositories,
  archiveRepositories,
  deleteCodespaces,
  promptConfirm,
  printNoReposDeleted,
  printNoReposArchived,
  printNoReposSelected,
  printNoCodespacesDeleted,
  printNoCodespaceSelected,
  printError,
};
