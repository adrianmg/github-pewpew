import UI from '../ui.js';

const gistsCommand = async () => {
  const gists = await UI.getGists();
  let res = await UI.promptSelectGists(gists);

  if (res.gists.length === 0) {
    UI.printNoGistSelected();
    return 0;
  }

  const gistsToDelete = res.gists;
  res = await UI.promptConfirm(gistsToDelete.length, 'gists', 'delete');

  if (res.confirm === 'Yes') {
    await UI.deleteGists(gistsToDelete);
  } else {
    UI.printNoGistsDeleted();
  }
};

export default gistsCommand;
