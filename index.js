#!/usr/bin/env node
const style = require('ansi-colors');
const { prompt } = require('enquirer');

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
  res = await prompt([
    {
      type: 'autocomplete',
      name: 'repos',
      message: 'Select repositories you want to delete:',
      limit: 12,
      multiple: true,
      format: (value) => style.green(value),
      footer: '––—————––—————––—————––—————––————————————',
      result: (value) => {
        if (value.length === 0) {
          UI.printNoReposSelected();

          process.exit();
        }
        return value;
      },
      choices: repositories.map(({ full_name }) => full_name),
    },
  ]);

  const reposToDelete = res.repos;
  const repoCount = reposToDelete.length;

  res = await prompt({
    type: 'select',
    name: 'confirmDelete',
    message: `Are you sure?`,
    format: (value) => value,
    choices: [
      {
        name: 'Yes',
        message: `${style.redBright(
          `Yes, delete ${repoCount > 1 ? 'repositories' : 'repository'} (${repoCount})`
        )}`,
        value: true,
      },
      {
        name: 'Cancel',
        message: 'Cancel',
        value: false,
      },
    ],
  });

  if (res.confirmDelete === 'Yes') {
    let deletedRepos = 0;
    for (const repo of reposToDelete) {
      const status = await deleteRepository(repo);
      if (status) {
        deletedRepos++;
      }
    }
    UI.printConfirmDelete(deletedRepos);
  } else {
    UI.printNoReposDeleted();
  }
})().catch((err) => {
  console.error(err);
});
