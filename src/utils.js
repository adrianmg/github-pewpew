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

const getLabel = (type, count) => {
  const { singular, plural } = labels[type];

  return count > 1 ? plural : singular;
};

module.exports = {
  getPackageDetails,
  getLabel,
};
