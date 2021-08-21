#!/usr/bin/env node
const { getRepositories, deleteRepository } = require('./src/github');
const { loadConfig, saveConfig, deleteConfig } = require('./src/config');
const UI = require('./src/ui');

UI.printWelcome();

main().then((exitCode) => {
  process.exit(exitCode);
});

async function main() {
  try {
    if (!loadConfig()) {
      const token = await UI.promptAuth();
      await saveConfig(token);
    }

    const repositories = await getRepositories(); // await UI.getRepositories();
    if (!repositories) {
      deleteConfig();
      console.log('hi from deleteConfig');

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
        const status = await deleteRepository(repo);
        if (status) deletedRepos++;
      }
      UI.printConfirmDelete(deletedRepos);
    } else {
      UI.printNoReposDeleted();
    }
  } catch (error) {
    // TODO: fix entering in error when user cancels the command before finishing it
    // is it due to an unsolved promise in any of the prompts?
    UI.printError(error);
    console.log('error:', error);

    console.log('Hi from catch');
    // deleteConfig(); instaceof error
    // return await main();
    return;
  }
}
