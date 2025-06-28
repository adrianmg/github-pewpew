import Config from '../config.js';
import UI from '../ui.js';

const reposCommand = async (archive) => {
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

  const reposToProcess = res.repos;
  const repoCount = reposToProcess.length;
  const action = archive ? 'archive' : 'delete';
  res = await UI.promptConfirm(repoCount, 'repos', action);

  if (res.confirm === 'Yes') {
    if (archive) {
      await UI.archiveRepositories(reposToProcess);
    } else {
      await UI.deleteRepositories(reposToProcess);
    }
  } else {
    if (archive) {
      UI.printNoReposArchived();
    } else {
      UI.printNoReposDeleted();
    }
  }
};

export default reposCommand;
