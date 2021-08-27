import { PackageDetails } from '../@types';

function getPackageDetails(): PackageDetails {
  return {
    package: require('../package.json'),
    author: 'adrianmg',
  };
}

export { getPackageDetails };
