import { createRequire } from 'module';

function getPackageDetails() {
  const require = createRequire(import.meta.url);
  const data = require('../package.json');

  return {
    package: data,
    author: 'adrianmg',
  };
}

const labels = {
  repos: { singular: 'repository', plural: 'respositories' },
  codespaces: { singular: 'codespace', plural: 'codespaces' },
};

function uiGetLabel(type, count) {
  const { singular, plural } = labels[type];

  return count > 1 ? plural : singular;
}

function uiHelpGetSpacing() {
  return '  ';
}

export default {
  getPackageDetails,
  uiGetLabel,
  uiHelpGetSpacing,
};
