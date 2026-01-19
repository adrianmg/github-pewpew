#!/usr/bin/env bun

const isBunRuntime = typeof Bun !== 'undefined' || Boolean(process.versions?.bun);

if (!isBunRuntime) {
  console.error('OpenTUI requires Bun. Please run this command with bun.');
  process.exit(1);
}

const main = async () => {
  const [{ default: Config }, { default: Github }, { default: UI }, { default: reposCommand }, { default: codespacesCommand }] =
    await Promise.all([
      import('./src/config.js'),
      import('./src/github.js'),
      import('./src/ui.js'),
      import('./src/commands/repos.js'),
      import('./src/commands/codespaces.js'),
    ]);

  UI.printWelcome();

  try {
    if (!Config.load()) {
      const token = await UI.promptAuth();
      Config.save(token);
    }

    const command = process.argv[2];
    const archive = process.argv.includes('--archive') || process.argv.includes('-a');

    switch (command) {
      case 'repos':
      case 'repo':
      case 'repository':
      case 'repositories':
        await reposCommand(archive);
        break;
      case 'codespaces':
      case 'codespace':
        await codespacesCommand();
        break;
      case 'help':
        UI.printHelp();
        break;
      default:
        if (!command) {
          UI.printHelp();
          break;
        }
        UI.printHelp();
    }
  } catch (error) {
    if (error instanceof Github.AuthError || error instanceof Github.ScopesError) {
      Config.deleteFile();

      return await main();
    }

    UI.printError(error);
  }
};

main();
