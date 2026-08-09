import Config from '../config.js';
import RepoOptions from '../repo-options.js';
import UI from '../ui.js';

const reposCommand = async (options = {}) => {
  const { archive = false, force = false } = options;
  const repositories = await UI.getRepositories();
  if (!repositories) {
    Config.deleteFile();
    return await main();
  }

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
    return 0;
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
      return 0;
    }
  }

  if (archive) {
    await UI.archiveRepositories(reposToProcess);
  } else {
    await UI.deleteRepositories(reposToProcess);
  }
};

export default reposCommand;
