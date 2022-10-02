import Config from '../config.js';
import UI from '../ui.js';

const codespacesCommand = async () => {
  const codespaces = await UI.getCodespaces();
  if (!codespaces) {
    Config.deleteFile();
    return await main();
  }

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
    UI.printNoCodespacesDeleted();
  }
};

export default codespacesCommand;
