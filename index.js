#!/usr/bin/env node
const CONFIG = require('./src/config');
const GITHUB = require('./src/github');
const UI = require('./src/ui');

UI.printWelcome();

main().then((exitCode) => {
  process.exit(exitCode);
});

async function main() {
  try {
    if (!CONFIG.load()) {
      const token = await UI.promptAuth();
      await CONFIG.save(token);
    }

    const repositories = await UI.getRepositories();
    if (!repositories) {
      CONFIG.deleteFile();
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
    if (error instanceof GITHUB.AuthError || error instanceof GITHUB.ScopesError) {
      CONFIG.deleteFile();

      return await main();
    }

    UI.printError(error);
    return;
  }
}
