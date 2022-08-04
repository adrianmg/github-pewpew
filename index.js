#!/usr/bin/env node

const Config = require('./src/config');
const Github = require('./src/github');
const UI = require('./src/ui');

const reposCommand = require('./src/commands/repos');
const codespacesCommand = require('./src/commands/codespaces');

UI.printWelcome();

const main = async () => {
  try {
    if (!Config.load()) {
      const token = await UI.promptAuth();
      Config.save(token);
    }

    const command = process.argv[2];

    switch (command) {
      case 'repos':
      case 'repo':
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
          await reposCommand();
        }
        UI.printHelp();
    }
  } catch (error) {
    if (error instanceof Github.AuthError || error instanceof Github.ScopesError) {
      Config.deleteFile();

      return await main();
    }

    UI.printError(error);
    return;
  }
};

main();
