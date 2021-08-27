import { PackageDetails } from '../@types/utils';

function getPackageDetails(): PackageDetails {
  return {
    package: require('../package.json'),
    author: 'adrianmg',
  };
}

module.exports = {
  getPackageDetails,
};
