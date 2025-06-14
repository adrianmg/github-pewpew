import Config from '../config.js';
import UI from '../ui.js';

declare function main(): Promise<void>;

const codespacesCommand = async (): Promise<void | number> => {
  const codespaces = await UI.getCodespaces();
  if (!codespaces) {
    Config.deleteFile();
    return await main();
  }

  const selection = await UI.promptSelectCodespaces(codespaces);

  if (selection.codespaces.length === 0) {
    UI.printNoCodespaceSelected();

    return 0;
  }

  const codespacesToDelete = selection.codespaces;
  const codespaceCount = codespacesToDelete.length;
  const confirm = await UI.promptConfirmDelete(codespaceCount, 'codespaces');

  if (confirm.confirmDelete) {
    await UI.deleteCodespaces(codespacesToDelete);
  } else {
    UI.printNoCodespacesDeleted();
  }
};

export default codespacesCommand;
