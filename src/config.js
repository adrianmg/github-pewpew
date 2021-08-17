const fs = require('fs');
const path = require('path');

const { setToken } = require('./github');
const { getPackageDetails } = require('./utils');

const { package: PACKAGE, author: PACKAGE_AUTHOR } = getPackageDetails();
const HOME_DIR = require('os').homedir();
const CONFIG_DIR = getConfigDir(HOME_DIR);
const CONFIG_FILE = path.join(CONFIG_DIR, 'auth.json');

async function saveConfig(token) {
  const configuration = {
    _: `This is your ${PACKAGE.name} credentials. DO NOT SHARE!`,
    token: token,
  };

  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(configuration), 'utf8');

  return true;
}

function loadConfig() {
  const configExists = fs.existsSync(CONFIG_FILE);

  if (!configExists) return false;

  let config = fs.readFileSync(CONFIG_FILE, 'utf8');
  config = JSON.parse(config);

  return setToken(config.token);
}

function getConfigDir(homeDir) {
  const configDir = path.join(
    homeDir,
    process.platform === 'win32'
      ? path.join('AppData', 'Roaming', PACKAGE_AUTHOR, PACKAGE.name)
      : path.join('Library', `com.${PACKAGE_AUTHOR}.${PACKAGE.name}`)
  );

  return configDir;
}

module.exports = {
  saveConfig,
  loadConfig,
};
