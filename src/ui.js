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
  printHelpCommand('repos [options]', 'Delete or archive repositories');
  printHelpCommand('gists', 'Delete gists');
  printHelpCommand('codespaces', 'Delete codespaces');
  printHelpCommand('help', 'Show help');

  console.log();

  printHelpHeader('Repository options');
  printHelpCommand('--archive, -a', 'Archive instead of delete');
  printHelpCommand('--force', 'Skip the final confirmation');
  printHelpCommand('--regex <pattern>', 'Select matching owner/repository names');
  printHelpCommand('--list <repos>', 'Select comma-separated owner/repository names');

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
      choices: repositories.map((repo) => {
        return {
          name: repo.full_name,
          message: repo.archived
            ? `${repo.full_name} ${style.dim('(archived)')}`
            : repo.full_name,
        };
      }),
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

async function promptSelectGists(gists) {
  try {
    if (gists.length === 0) return { gists: [] };

    return await prompt({
      type: 'autocomplete',
      name: 'gists',
      message: 'Select gists you want to delete:',
      limit: 12,
      multiple: true,
      footer: '—————————————————————————————————————————————————',
      format: (value) => style.green(value),
      choices: gists.map((gist) => {
        return {
          name: gist.id,
          message: formatGist(gist),
        };
      }),
    });
  } catch (error) {
    return { gists: [] };
  }
}

function formatGist(gist) {
  const filenames = Object.keys(gist.files || {});
  const title = gist.description || filenames[0] || 'Untitled gist';
  const safeTitle =
    String(title)
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Untitled gist';
  const visibility = gist.public ? 'public' : 'secret';

  return `${safeTitle} ${style.dim(`(${visibility}, ${gist.id})`)}`;
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
    throw error;
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
    throw error;
  }
}

async function getGists() {
  const strMessage = `Fetching gists…`;
  const spinner = ora(strMessage).start();

  try {
    const gists = await Github.getGists();

    const count = gists.length;
    const strSucceed = printGistsFound(count);
    spinner.succeed(style.dim(strSucceed));

    return gists;
  } catch (error) {
    spinner.stop();
    throw error;
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

function printGistsFound(count) {
  return `${count} ${count === 1 ? 'gist' : 'gists'} found.`;
}

function isTokenError(error) {
  return error instanceof Github.AuthError || error instanceof Github.ScopesError;
}

function getErrorMessage(error) {
  return error.response?.data?.message || error.message;
}

async function processItems(items, mutate, formatProcessed) {
  const processed = [];
  const failed = [];
  let authError;

  for (const item of items) {
    const spinner = ora().start();

    try {
      await mutate(item);
      processed.push(item);

      spinner.stopAndPersist({ symbol: '', text: formatProcessed(item) });
    } catch (error) {
      failed.push(item);

      spinner.fail(style.dim(`${item} (Oops! ${getErrorMessage(error)})`));

      if (isTokenError(error)) {
        authError = error;
        break;
      }
    }
  }

  return { processed, failed, authError };
}

async function deleteRepositories(repositories) {
  const summary = await processItems(
    repositories,
    (repo) => Github.deleteRepository(repo),
    (repo) => style.strikethrough.dim(repo)
  );

  if (summary.processed.length > 0) {
    printConfirmation(summary.processed, 'repos', 'delete');
  } else {
    printNoReposDeleted();
  }

  return summary;
}

async function archiveRepositories(repositories) {
  const summary = await processItems(
    repositories,
    (repo) => Github.archiveRepository(repo),
    (repo) => style.dim(repo)
  );

  if (summary.processed.length > 0) {
    printConfirmation(summary.processed, 'repos', 'archive');
  } else {
    printNoReposArchived();
  }

  return summary;
}

async function deleteCodespaces(codespaces) {
  const summary = await processItems(
    codespaces,
    (codespace) => Github.deleteCodespace(codespace),
    (codespace) => style.strikethrough.dim(codespace)
  );

  if (summary.processed.length > 0) {
    printConfirmation(summary.processed, 'codespaces', 'delete');
  } else {
    printNoCodespacesDeleted();
  }

  return summary;
}

async function deleteGists(gists) {
  const summary = await processItems(
    gists,
    (gist) => Github.deleteGist(gist),
    (gist) => style.strikethrough.dim(gist)
  );

  if (summary.processed.length > 0) {
    printConfirmation(summary.processed, 'gists', 'delete');
  } else {
    printNoGistsDeleted();
  }

  return summary;
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

function printNoGistsDeleted() {
  return console.log(style.dim('Rest assured, no gists were deleted.'));
}

function printNoReposSelected() {
  const strMessage = `No repositories selected. (Press 'space' to select)`;

  return console.log(style.dim(strMessage));
}

function printReposMatched(repositories) {
  const label = repositories.length === 1 ? 'repository' : 'repositories';
  console.log(style.dim(`Matched ${repositories.length} ${label}:`));
  for (const repository of repositories) {
    console.log(`  ${repository}`);
  }
  console.log();
}

function printNoReposMatched() {
  return console.log(style.dim('No repositories matched.'));
}

function printNoCodespaceSelected() {
  const strMessage = `No codespaces selected. (Press 'space' to select)`;

  return console.log(style.dim(strMessage));
}

function printNoGistSelected() {
  return console.log(style.dim("No gists selected. (Press 'space' to select)"));
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
  getGists,
  promptSelectRepositories,
  promptSelectCodespaces,
  promptSelectGists,
  deleteRepositories,
  archiveRepositories,
  deleteCodespaces,
  deleteGists,
  promptConfirm,
  printNoReposDeleted,
  printNoReposArchived,
  printNoReposSelected,
  printReposMatched,
  printNoReposMatched,
  printNoCodespacesDeleted,
  printNoCodespaceSelected,
  printNoGistsDeleted,
  printNoGistSelected,
  printError,
};
