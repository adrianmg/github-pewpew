import style from 'ansi-colors';
import ora from 'ora';
import clipboard from 'clipboardy';
import Enquirer from 'enquirer';
const { prompt } = Enquirer;

import Utils from './utils.js';
import Github from './github.js';

interface Repository {
  full_name: string;
}

interface Codespace {
  name: string;
}

const PACKAGE = Utils.getPackageDetails().package;
const PACKAGE_COMMAND = Object.keys(Utils.getPackageDetails().package.bin)[0];

function printWelcome(): void {
  const name = PACKAGE.name;
  const description = PACKAGE.description;
  const version = PACKAGE.version;

  if (name && description && version) {
    console.log(`${style.bold(`${name} v${version}`)}`);
    console.log(description);
    console.log();
  }
}

function printHelp(): void {
  printHelpHeader('Usage');
  printHelpUsage();

  console.log();

  printHelpHeader('Commands');
  printHelpCommand('codespaces', 'Delete codespaces');
  printHelpCommand('repos', 'Delete repositories');
  printHelpCommand('help', '\tShow help');

  console.log();
}

function printHelpUsage(): void {
  const command = PACKAGE_COMMAND;
  const spacing = Utils.uiHelpGetSpacing();

  console.log(`${spacing}${command} <command>`);
}

function printHelpHeader(text: string): void {
  const header = text.toUpperCase();
  console.log(style.bold(header));
}

function printHelpCommand(command: string, description: string): void {
  const spacing = Utils.uiHelpGetSpacing();
  console.log(`${spacing}${command}:\t${description}`);
}

async function promptAuth(): Promise<string> {
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

function requestToken(verification: any): void {
  const strOpen = `Open:`;
  const strURL = verification.verification_uri;
  const strCode = `Code:`;
  const strCodeValue = verification.user_code;
  const strClipboard = `Copied to clipboard!`;

  console.log(`${style.bold(strOpen)} ${style.cyan.underline(strURL)}`);
  console.log(`${style.bold(strCode)} ${strCodeValue} ${style.dim(strClipboard)}`);
}

async function promptSelectRepositories(
  repositories: Repository[]
): Promise<{ repos: string[] }> {
  try {
    if (repositories.length === 0) throw new Error();

    return await prompt({
      type: 'autocomplete',
      name: 'repos',
      message: 'Select repositories you want to delete:',
      limit: 12,
      multiple: true,
      footer: '—————————————————————————————————————————————————',
      format: (value: string) => style.green(value),
      choices: repositories.map(({ full_name }) => full_name),
    } as any);
  } catch {
    return { repos: [] };
  }
}

async function promptSelectCodespaces(
  codespaces: Codespace[]
): Promise<{ codespaces: string[] }> {
  try {
    if (codespaces.length === 0) throw new Error();

    return await prompt({
      type: 'autocomplete',
      name: 'codespaces',
      message: `Select codespaces you want to delete:`,
      limit: 12,
      multiple: true,
      footer: '—————————————————————————————————————————————————',
      format: (value: string) => style.green(value),
      choices: codespaces.map(({ name }) => name),
    } as any);
  } catch {
    return { codespaces: [] };
  }
}

async function getRepositories(): Promise<Repository[] | undefined> {
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

async function getCodespaces(): Promise<Codespace[] | undefined> {
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

function printReposFound(count: number): string {
  const strMessage = `${count} ${count > 1 ? 'repositories' : 'repository'} found.`;

  return strMessage;
}

function printCodespacesFound(count: number): string {
  const strMessage = `${count} ${count > 1 ? 'codespaces' : 'codespace'} found.`;

  return strMessage;
}

async function deleteRepositories(repositories: string[]): Promise<void> {
  const deletedRepos: string[] = [];

  for (const repo of repositories) {
    const spinner = ora().start();

    try {
      await Github.deleteRepository(repo);
      deletedRepos.push(repo);

      spinner.stopAndPersist({ symbol: '', text: style.strikethrough.dim(repo) });
    } catch (error) {
      const message = (error as any).response?.data?.message;

      spinner.fail(style.dim(`${repo} (Oops! ${message})`));
    }
  }

  if (deletedRepos.length > 0) {
    printConfirmDelete(deletedRepos, 'repos');
  } else {
    printNoReposDeleted();
  }
}

async function archiveRepositories(repositories: string[]): Promise<void> {
  const archivedRepos: string[] = [];

  for (const repo of repositories) {
    const spinner = ora().start();

    try {
      await Github.archiveRepository(repo);
      archivedRepos.push(repo);

      spinner.stopAndPersist({ symbol: '', text: style.dim(repo) });
    } catch (error) {
      const message = (error as any).response?.data?.message;

      spinner.fail(style.dim(`${repo} (Oops! ${message})`));
    }
  }

  if (archivedRepos.length > 0) {
    printConfirmArchive(archivedRepos);
  } else {
    printNoReposArchived();
  }
}

async function deleteCodespaces(codespaces: string[]): Promise<void> {
  const deletedCodespaces: string[] = [];

  for (const codespace of codespaces) {
    const spinner = ora().start();

    try {
      await Github.deleteCodespace(codespace);
      deletedCodespaces.push(codespace);

      spinner.stopAndPersist({ symbol: '', text: style.strikethrough.dim(codespace) });
    } catch (error) {
      const message = (error as any).response?.data?.message;

      spinner.fail(style.dim(`${codespace} (Oops! ${message})`));
    }
  }

  if (deletedCodespaces.length > 0) {
    printConfirmDelete(deletedCodespaces, 'codespaces');
  } else {
    printNoCodespacesDeleted();
  }
}

async function promptConfirmDelete(
  count: number,
  type: 'repos' | 'codespaces',
  action: 'delete' | 'archive' = 'delete'
): Promise<{ confirmDelete: boolean }> {
  return await prompt({
    type: 'select',
    name: 'confirmDelete',
    message: `Are you sure?`,
    format: (value: boolean) => value,
    choices: [
      {
        name: 'Yes',
        message: `${style.redBright(
          `Yes, ${action} ${Utils.uiGetLabel(type, count)} (${count})`
        )}`,
        value: true,
      },
      {
        name: 'Cancel',
        message: 'Cancel',
        value: false,
      },
    ]
  } as any);
}

function printConfirmDelete(
  deletedItems: string[],
  type: 'repos' | 'codespaces'
): boolean {
  const count = deletedItems.length;

  const strDeletedItems = count > 1 ? deletedItems.join(', ') : deletedItems;
  const strItems = Utils.uiGetLabel(type, count);
  const strConfirm = `🔫 pew pew! ${count} ${strItems} deleted successfully: ${strDeletedItems}`;
  const strRecover = `Recover repositories from github.com/settings/repositories`;

  console.log(strConfirm);
  type === 'repos' && console.log(style.dim(strRecover));

  return true;
}

function printConfirmArchive(archivedItems: string[]): boolean {
  const count = archivedItems.length;
  const strArchivedItems = count > 1 ? archivedItems.join(', ') : archivedItems;
  const strConfirm = `📦 ${count} repos archived successfully: ${strArchivedItems}`;

  console.log(strConfirm);

  return true;
}

function printNoReposDeleted(): void {
  const strMessage = `Rest assured, no repositories were deleted.`;

  return console.log(style.dim(strMessage));
}

function printNoReposArchived(): void {
  const strMessage = `Rest assured, no repositories were archived.`;

  return console.log(style.dim(strMessage));
}

function printNoCodespacesDeleted(): void {
  const strMessage = `Rest assured, no codespaces were deleted.`;

  return console.log(style.dim(strMessage));
}

function printNoReposSelected(): void {
  const strMessage = `No repositories selected. (Press 'space' to select)`;

  return console.log(style.dim(strMessage));
}

function printNoCodespaceSelected(): void {
  const strMessage = `No codespaces selected. (Press 'space' to select)`;

  return console.log(style.dim(strMessage));
}

function printError(strError: string | Error): void {
  console.log();
  return console.log(style.redBright(String(strError)));
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
  promptConfirmDelete,
  printConfirmArchive,
  printNoReposDeleted,
  printNoReposArchived,
  printNoReposSelected,
  printNoCodespacesDeleted,
  printNoCodespaceSelected,
  printError,
};
