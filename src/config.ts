import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

import * as Github from './github';
import * as Utils from './utils';
import Types from '../@types';

const { package: PACKAGE, author: PACKAGE_AUTHOR } = Utils.getPackageDetails();

const HOME_DIR = homedir();
const CONFIG_DIR = getConfigDir(HOME_DIR);
const CONFIG_FILE = path.join(CONFIG_DIR, 'auth.json');

function save(token: string): boolean {
  const configuration: Types.Configuration = {
    _: `This is your ${PACKAGE.name} credentials. DO NOT SHARE!`,
    token: token,
  };

  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(configuration), 'utf8');

  return true;
}

function load(): any | false {
  const configExists = fs.existsSync(CONFIG_FILE);

  if (!configExists) return false;

  const config = fs.readFileSync(CONFIG_FILE, 'utf8');
  const token = JSON.parse(config).token;

  return Github.setToken(token);
}

function deleteFile(): void | false {
  const configExists = fs.existsSync(CONFIG_FILE);

  if (!configExists) return false;

  return fs.unlinkSync(CONFIG_FILE);
}

function getConfigDir(homeDir: string): string {
  const configDir = path.join(
    homeDir,
    process.platform === 'win32'
      ? path.join('AppData', 'Roaming', PACKAGE_AUTHOR, PACKAGE.name)
      : path.join('Library', `com.${PACKAGE_AUTHOR}.${PACKAGE.name}`)
  );

  return configDir;
}

export { save, load, deleteFile };
