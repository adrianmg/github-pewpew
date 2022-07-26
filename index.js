#!/usr/bin/env node
const Config = require('./src/config');
const Github = require('./src/github');
const UI = require('./src/ui');

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

    if (process.argv[2] == 'codespaces') {
      const codespaces = await UI.getCodespaces();

      let res = await UI.promptSelectCodespaces(codespaces);

      if (res.codespaces.length === 0) {
        UI.printNoCodespaceSelected();

        return 0;
      }

      const codespacesToDelete = res.codespaces;
      const codespaceCount = codespacesToDelete.length;
      res = await UI.promptConfirmDelete(codespaceCount, 'codespaces');

      if (res.confirmDelete === 'Yes') {
        await UI.deleteCodespaces(codespacesToDelete);
      } else {
        UI.printNoReposDeleted();
      }
    } else {
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
      res = await UI.promptConfirmDelete(repoCount, 'repos');

      if (res.confirmDelete === 'Yes') {
        await UI.deleteRepositories(reposToDelete);
      } else {
        UI.printNoReposDeleted();
      }
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
