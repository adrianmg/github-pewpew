#!/usr/bin/env node
const { Command } = require('commander');

const Config = require('./src/config');
const Github = require('./src/github');
const UI = require('./src/ui');
const Utils = require('./src/utils');

const reposCommand = require('./src/commands/repos');
const codespacesCommand = require('./src/commands/codespaces');

UI.printWelcome();

const main = async () => {
  try {
    const PACKAGE = Utils.getPackageDetails().package;

    const program = new Command();

    program.name(PACKAGE.name).description(PACKAGE.description).version(PACKAGE.version);

    program.action(reposCommand);

    program.addHelpCommand('help');

    program
      .command('codespaces')
      .alias('codespace')
      .description('Delete codespaces')
      .action(codespacesCommand);

    program
      .command('repos')
      .alias('repo')
      .description('Delete repositories')
      .action(reposCommand);

    if (!Config.load()) {
      const token = await UI.promptAuth();
      Config.save(token);
    }

    program.parseAsync(process.argv);
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
