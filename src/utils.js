function getPackageDetails() {
  return {
    package: require('../package.json'),
    author: 'adrianmg',
  };
}

module.exports = {
  getPackageDetails,
};
