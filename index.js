#!/usr/bin/env node
const { auth, getRepositories, deleteRepository } = require('./src/github');
const { loadConfig, saveConfig } = require('./src/config');
const UI = require('./src/ui');

(async function main() {
  UI.printWelcome();

  if (!loadConfig()) {
    const token = await auth();
    await saveConfig(token);
  }

  const repositories = await getRepositories();
  let res = await UI.promptGetRepositories(repositories);

  if (res.repos.length === 0) {
    UI.printNoReposSelected();
    process.exit();
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
})().catch((err) => {
  UI.printError(err);
});
