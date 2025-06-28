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
      message: 'Select repositories you want to process:',
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
    printConfirmation(deletedRepos, 'repos', 'delete');
  } else {
    printNoReposDeleted();
  }
}

async function archiveRepositories(repositories) {
  const archivedRepos = [];

  for (const repo of repositories) {
    const spinner = ora().start();

    try {
      await Github.archiveRepository(repo);
      archivedRepos.push(repo);

      spinner.stopAndPersist({ symbol: '', text: style.dim(repo) });
    } catch (error) {
      const message = error.response?.data?.message;

      spinner.fail(style.dim(`${repo} (Oops! ${message})`));
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
    printConfirmation(deletedCodespaces, 'codespaces', 'delete');
  } else {
    printNoCodespacesDeleted();
  }
}

async function promptConfirm(count, type, action) {
  const capitalizedAction = action.charAt(0).toUpperCase() + action.slice(1);

  return await prompt({
    type: 'select',
    name: 'confirm',
    message: 'Are you sure?',
    format: (value) => value,
    choices: [
      {
        name: 'Yes',
        message: `${style.redBright(
          `Yes, ${action} ${Utils.uiGetLabel(type, count)} (${count})`
        )}`,
        value: 'Yes',
      },
      {
        name: 'Cancel',
        message: 'Cancel',
        value: 'No',
      },
    ],
  });
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
