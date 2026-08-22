#!/usr/bin/env node

import CommandSummary from './src/command-summary.js';
import Config from './src/config.js';
import Github from './src/github.js';
import RepoOptions from './src/repo-options.js';
import UI from './src/ui.js';

import reposCommand from './src/commands/repos.js';
import codespacesCommand from './src/commands/codespaces.js';
import gistsCommand from './src/commands/gists.js';

UI.printWelcome();

const main = async () => {
  let summary;

  try {
    if (!Config.load()) {
      const token = await UI.promptAuth();
      Config.save(token);
    }

    const command = process.argv[2];
    switch (command) {
      case 'repos':
      case 'repo':
      case 'repository':
      case 'repositories':
        summary = await reposCommand(RepoOptions.parse(process.argv.slice(3)));
        break;
      case 'codespaces':
      case 'codespace':
        summary = await codespacesCommand();
        break;
      case 'gists':
      case 'gist':
        summary = await gistsCommand();
        break;
      case 'help':
        UI.printHelp();
        break;
      default:
        if (!command) {
          // await reposCommand();
          UI.printHelp();
          break;
        }
        UI.printHelp();
    }
  } catch (error) {
    if (error instanceof Github.AuthError || error instanceof Github.ScopesError) {
      Config.deleteFile();

      return await main();
    }

    UI.printError(error);
    process.exitCode = 1;
    return;
  }

  // Mutations are never replayed: a token-wide failure only invalidates the
  // cached credentials so the next invocation authenticates again.
  const outcome = CommandSummary.resolveOutcome(summary);

  if (outcome.invalidateConfig) {
    Config.deleteFile();
    UI.printError(summary.authError.message);
  }

  if (outcome.exitCode !== 0) process.exitCode = outcome.exitCode;
};

main();
