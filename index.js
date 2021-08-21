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
      let deletedRepos = 0;

      for (const repo of reposToDelete) {
        const status = await GITHUB.deleteRepository(repo);
        if (status) deletedRepos++;
      }

      UI.printConfirmDelete(deletedRepos);
    } else {
      UI.printNoReposDeleted();
    }
  } catch (error) {
    console.log('Hi from MAIN CATCH');

    if (error instanceof GITHUB.AuthError || error instanceof GITHUB.ScopesError) {
      CONFIG.deleteFile();

      return await main();
    }

    return;
  }
}
