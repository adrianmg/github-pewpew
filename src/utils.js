function getPackageDetails() {
  return {
    package: require('../package.json'),
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

module.exports = {
  getPackageDetails,
  uiGetLabel,
  uiHelpGetSpacing,
};
