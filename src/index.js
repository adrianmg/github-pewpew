#!/usr/bin/env node
const Config = require('./config');
const Github = require('./github');
const UI = require('./ui');

UI.printWelcome();

main().then((exitCode) => {
  process.exit(exitCode);
});

async function main() {
  try {
    if (!Config.load()) {
      const token = await UI.promptAuth();
      Config.save(token);
    }

    const repositories = await UI.getRepositories();
    if (!repositories) {
      Config.deleteFile();
      return await main();
    }

    let res = await UI.promptSelectRepositories(repositories);
    if (res.repos.length === 0) {
      UI.printNoReposSelected();

      return 0;
    }

    const reposToDelete = res.repos;
    const repoCount = reposToDelete.length;
    res = await UI.promptConfirmDelete(repoCount);

    if (res.confirmDelete === 'Yes') {
      await UI.deleteRepositories(reposToDelete);
    } else {
      UI.printNoReposDeleted();
    }
  } catch (error) {
    if (error instanceof Github.AuthError || error instanceof Github.ScopesError) {
      Config.deleteFile();

      return await main();
    }

    UI.printError(error);
    return;
  }
}
