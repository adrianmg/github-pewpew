import Config from '../config.js';
import UI from '../ui.js';

declare function main(): Promise<void>;

const reposCommand = async (): Promise<void | number> => {
  const repositories = await UI.getRepositories();
  if (!repositories) {
    Config.deleteFile();
    return await main();
  }

  const selection = await UI.promptSelectRepositories(repositories);

  if (selection.repos.length === 0) {
    UI.printNoReposSelected();

    return 0;
  }

  const reposToDelete = selection.repos;
  const repoCount = reposToDelete.length;
  const isArchive = process.argv.includes('--archive') || process.argv.includes('-a');
  const confirm = await UI.promptConfirmDelete(repoCount, 'repos', isArchive ? 'archive' : 'delete');

  if (confirm.confirmDelete) {
    if (isArchive) {
      await UI.archiveRepositories(reposToDelete);
    } else {
      await UI.deleteRepositories(reposToDelete);
    }
  } else {
    isArchive ? UI.printNoReposArchived() : UI.printNoReposDeleted();
  }
};

export default reposCommand;
