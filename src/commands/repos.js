import Config from '../config.js';
import UI from '../ui.js';

const reposCommand = async () => {
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
};

export default reposCommand;
