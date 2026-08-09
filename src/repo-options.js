const REPOSITORY_NAME_PATTERN = /^[^/\s]+\/[^/\s]+$/;

function readOptionValue(args, index, name) {
  const argument = args[index];
  const inlinePrefix = `${name}=`;

  if (argument.startsWith(inlinePrefix)) {
    const value = argument.slice(inlinePrefix.length);
    if (!value) throw new Error(`${name} requires a value.`);

    return { value, nextIndex: index };
  }

  if (argument !== name) return undefined;

  const value = args[index + 1];
  if (!value || value.startsWith('--') || value === '-a') {
    throw new Error(`${name} requires a value.`);
  }

  return { value, nextIndex: index + 1 };
}

function parse(args = []) {
  const options = {
    archive: false,
    force: false,
  };
  let regexPattern;
  let repositoryList;

  for (let index = 0; index < args.length; index++) {
    const argument = args[index];

    if (argument === '--archive' || argument === '-a') {
      options.archive = true;
      continue;
    }

    if (argument === '--force') {
      options.force = true;
      continue;
    }

    const regexOption = readOptionValue(args, index, '--regex');
    if (regexOption) {
      if (regexPattern !== undefined) {
        throw new Error('--regex can only be specified once.');
      }

      regexPattern = regexOption.value;
      index = regexOption.nextIndex;
      continue;
    }

    const listOption = readOptionValue(args, index, '--list');
    if (listOption) {
      if (repositoryList !== undefined) {
        throw new Error('--list can only be specified once.');
      }

      repositoryList = listOption.value;
      index = listOption.nextIndex;
      continue;
    }

    throw new Error(`Unknown repository option: ${argument}`);
  }

  if (regexPattern !== undefined && repositoryList !== undefined) {
    throw new Error('--regex and --list cannot be used together.');
  }

  if (regexPattern !== undefined) {
    try {
      options.regex = new RegExp(regexPattern);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid --regex pattern "${regexPattern}": ${error.message}`);
      }

      throw error;
    }
  }

  if (repositoryList !== undefined) {
    const repositories = repositoryList.split(',').map((repository) => repository.trim());
    const invalidRepositories = repositories.filter(
      (repository) => !REPOSITORY_NAME_PATTERN.test(repository)
    );

    if (invalidRepositories.length > 0) {
      const invalidNames = invalidRepositories
        .map((repository) => repository || '<empty>')
        .join(', ');
      throw new Error(
        `--list entries must use the full owner/repository name: ${invalidNames}`
      );
    }

    options.list = repositories;
  }

  return options;
}

function selectRepositories(repositories, options) {
  if (options.regex) {
    return repositories
      .map(({ full_name: fullName }) => fullName)
      .filter((fullName) => options.regex.test(fullName));
  }

  if (options.list) {
    const repositoriesByName = new Map(
      repositories.map(({ full_name: fullName }) => [fullName.toLowerCase(), fullName])
    );
    const selectedRepositories = [];
    const selectedNames = new Set();
    const missingRepositories = [];

    for (const repository of options.list) {
      const normalizedName = repository.toLowerCase();
      if (selectedNames.has(normalizedName)) continue;

      const fullName = repositoriesByName.get(normalizedName);
      if (!fullName) {
        missingRepositories.push(repository);
        continue;
      }

      selectedNames.add(normalizedName);
      selectedRepositories.push(fullName);
    }

    if (missingRepositories.length > 0) {
      throw new Error(`Repositories not found: ${missingRepositories.join(', ')}`);
    }

    return selectedRepositories;
  }

  return undefined;
}

export default {
  parse,
  selectRepositories,
};
