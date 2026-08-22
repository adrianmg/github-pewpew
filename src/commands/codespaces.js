import CommandSummary from '../command-summary.js';
import UI from '../ui.js';

const codespacesCommand = async () => {
  const codespaces = await UI.getCodespaces();

  let res = await UI.promptSelectCodespaces(codespaces);

  if (res.codespaces.length === 0) {
    UI.printNoCodespaceSelected();

    return CommandSummary.create();
  }

  const codespacesToDelete = res.codespaces;
  const codespaceCount = codespacesToDelete.length;
  res = await UI.promptConfirm(codespaceCount, 'codespaces', 'delete');

  if (res.confirm !== 'Yes') {
    UI.printNoCodespacesDeleted();

    return CommandSummary.create();
  }

  return await UI.deleteCodespaces(codespacesToDelete);
};

export default codespacesCommand;
