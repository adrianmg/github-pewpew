import style from 'ansi-colors';
import ora from 'ora';
import clipboard from 'clipboardy';
import Enquirer from 'enquirer';
const { prompt } = Enquirer;

import Utils from './utils.js';
import Github from './github.js';

const PACKAGE = Utils.getPackageDetails().package;
const PACKAGE_COMMAND = Object.keys(Utils.getPackageDetails().package.bin)[0];

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
  printHelpCommand('repos', 'Delete repositories');
  printHelpCommand('help', '\tShow help');

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
  console.log(`${spacing}${command}:\t${description}`);
}

async function promptAuth() {
  const strSignIn = `Sign in to GitHub:`;
  const spinner = ora();

  console.log(style.dim(strSignIn));

  const token = await Github.auth((verification) => {
    requestToken(verification);
    spinner.start();

    clipboard.writeSync(verification.user_code);
  });

  spinner.stop();
  console.log();

  return token;
}

function requestToken(verification) {
  const strOpen = `Open:`;
  const strURL = verification.verification_uri;
  const strCode = `Code:`;
  const strCodeValue = verification.user_code;
  const strClipboard = `Copied to clipboard!`;

  console.log(`${style.bold(strOpen)} ${style.cyan.underline(strURL)}`);
  console.log(`${style.bold(strCode)} ${strCodeValue} ${style.dim(strClipboard)}`);
}

async function promptSelectRepositories(repositories) {
  try {
    if (repositories.length === 0) throw error;

    return await prompt({
      type: 'autocomplete',
      name: 'repos',
      message: 'Select repositories you want to delete:',
      limit: 12,
      multiple: true,
      footer: '—————————————————————————————————————————————————',
      format: (value) => style.green(value),
      choices: repositories.map(({ full_name }) => full_name),
    });
  } catch (error) {
    return { repos: [] };
  }
}

async function promptSelectCodespaces(codespaces) {
  try {
    if (codespaces.length === 0) throw error;

    return await prompt({
      type: 'autocomplete',
      name: 'codespaces',
      message: `Select codespaces you want to delete:`,
      limit: 12,
      multiple: true,
      footer: '—————————————————————————————————————————————————',
      format: (value) => style.green(value),
      choices: codespaces.map(({ name }) => name),
    });
  } catch (error) {
    return { codespaces: [] };
  }
}

async function getRepositories() {
  const strMessage = `Fetching repositories…`;
  const spinner = ora(strMessage).start();

  try {
    const repositories = await Github.getRepositories();

    const count = repositories.length;
    const strSucceed = printReposFound(count);
    spinner.succeed(style.dim(strSucceed));

    return repositories;
  } catch (error) {
    spinner.stop();

    if (error instanceof Github.AuthError || error instanceof Github.ScopesError) {
      throw error;
    }
  }
}

async function getCodespaces() {
  const strMessage = `Fetching codespaces…`;
  const spinner = ora(strMessage).start();

  try {
    const codespaces = await Github.getCodespaces();

    const count = codespaces.length;
    const strSucceed = printCodespacesFound(count);
    spinner.succeed(style.dim(strSucceed));

    return codespaces;
  } catch (error) {
    spinner.stop();

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
    const spinner = ora().start();

    try {
      await Github.deleteRepository(repo);
      deletedRepos.push(repo);

      spinner.stopAndPersist({ symbol: '', text: style.strikethrough.dim(repo) });
    } catch (error) {
      const message = error.response?.data?.message;

      spinner.fail(style.dim(`${repo} (Oops! ${message})`));
    }
  }

  if (deletedRepos.length > 0) {
    printConfirmDelete(deletedRepos, 'repos');
  } else {
    printNoReposDeleted();
  }
}

async function deleteCodespaces(codespaces) {
  const deletedCodespaces = [];

  for (const codespace of codespaces) {
    const spinner = ora().start();

    try {
      await Github.deleteCodespace(codespace);
      deletedCodespaces.push(codespace);

      spinner.stopAndPersist({ symbol: '', text: style.strikethrough.dim(codespace) });
    } catch (error) {
      const message = error.response?.data?.message;

      spinner.fail(style.dim(`${codespace} (Oops! ${message})`));
    }
  }

  if (deletedCodespaces.length > 0) {
    printConfirmDelete(deletedCodespaces, 'codespaces');
  } else {
    printNoCodespacesDeleted();
  }
}

async function promptConfirmDelete(count, type) {
  return await prompt({
    type: 'select',
    name: 'confirmDelete',
    message: `Are you sure?`,
    format: (value) => value,
    choices: [
      {
        name: 'Yes',
        message: `${style.redBright(
          `Yes, delete ${Utils.uiGetLabel(type, count)} (${count})`
        )}`,
        value: true,
      },
      {
        name: 'Cancel',
        message: 'Cancel',
        value: false,
      },
    ],
  });
}

function printConfirmDelete(deletedItems, type) {
  const count = deletedItems.length;

  const strDeletedItems = count > 1 ? deletedItems.join(', ') : deletedItems;
  const strItems = Utils.uiGetLabel(type, count);
  const strConfirm = `🔫 pew pew! ${count} ${strItems} deleted successfully: ${strDeletedItems}`;
  const strRecover = `Recover repositories from github.com/settings/repositories`;

  console.log(strConfirm);
  type === 'repos' && console.log(style.dim(strRecover));

  return true;
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
  deleteCodespaces,
  promptConfirmDelete,
  printNoReposDeleted,
  printNoReposSelected,
  printNoCodespacesDeleted,
  printNoCodespaceSelected,
  printError,
};
