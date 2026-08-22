import CommandSummary from '../command-summary.js';
import RepoOptions from '../repo-options.js';
import UI from '../ui.js';

const reposCommand = async (options = {}) => {
  const { archive = false, force = false } = options;
  const repositories = await UI.getRepositories();

  let reposToProcess = RepoOptions.selectRepositories(repositories, options);

  if (reposToProcess === undefined) {
    const res = await UI.promptSelectRepositories(repositories);
    reposToProcess = res.repos;
  } else if (reposToProcess.length > 0) {
    UI.printReposMatched(reposToProcess);
  }

  if (reposToProcess.length === 0) {
    if (options.regex) {
      UI.printNoReposMatched();
    } else {
      UI.printNoReposSelected();
    }
    return CommandSummary.create();
  }

  const repoCount = reposToProcess.length;
  const action = archive ? 'archive' : 'delete';

  if (!force) {
    const res = await UI.promptConfirm(repoCount, 'repos', action);

    if (res.confirm !== 'Yes') {
      if (archive) {
        UI.printNoReposArchived();
      } else {
        UI.printNoReposDeleted();
      }
      return CommandSummary.create();
    }
  }

  if (archive) {
    return await UI.archiveRepositories(reposToProcess);
  }

  return await UI.deleteRepositories(reposToProcess);
};

export default reposCommand;
