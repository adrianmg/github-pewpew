import { createRequire } from 'module';

function getPackageDetails(): { package: any; author: string } {
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
} as const;

function uiGetLabel(type: keyof typeof labels, count: number): string {
  const { singular, plural } = labels[type];

  return count > 1 ? plural : singular;
}

function uiHelpGetSpacing(): string {
  return '  ';
}

export default {
  getPackageDetails,
  uiGetLabel,
  uiHelpGetSpacing,
};
