import CommandSummary from '../command-summary.js';
import UI from '../ui.js';

const gistsCommand = async () => {
  const gists = await UI.getGists();
  let res = await UI.promptSelectGists(gists);

  if (res.gists.length === 0) {
    UI.printNoGistSelected();
    return CommandSummary.create();
  }

  const gistsToDelete = res.gists;
  res = await UI.promptConfirm(gistsToDelete.length, 'gists', 'delete');

  if (res.confirm !== 'Yes') {
    UI.printNoGistsDeleted();

    return CommandSummary.create();
  }

  return await UI.deleteGists(gistsToDelete);
};

export default gistsCommand;
