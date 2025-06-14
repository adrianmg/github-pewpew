#!/usr/bin/env node

import Config from './src/config.js';
import Github from './src/github.js';
import UI from './src/ui.js';

import reposCommand from './src/commands/repos.js';
import codespacesCommand from './src/commands/codespaces.js';

UI.printWelcome();

const main = async (): Promise<void> => {
  try {
    if (!Config.load()) {
      const token = await UI.promptAuth();
      Config.save(token);
    }

  const command: string | undefined = process.argv[2];

    switch (command) {
      case 'repos':
      case 'repo':
      case 'repository':
      case 'repositories':
        await reposCommand();
        break;
      case 'codespaces':
      case 'codespace':
        await codespacesCommand();
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

    UI.printError(error as Error);
    return;
  }
};

main();
