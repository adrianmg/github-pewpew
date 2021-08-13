const fs = require('fs');
const path = require('path');
const style = require('ansi-colors');
const { setConfig } = require('./github');

const PACKAGE = require('../package.json');
const PACKAGE_AUTHOR = 'adrianmg';
const HOME_DIR = require('os').homedir();
const CONFIG_DIR = getConfigDir(HOME_DIR);
const CONFIG_FILE = path.join(CONFIG_DIR, 'auth.json');

function printWelcome() {
  const name = PACKAGE.name;
  const description = PACKAGE.description;
  const version = PACKAGE.version;

  if (name && description && version) {
    console.log(`${style.bold(`${name} v${version}`)}`);
    console.log(description);
    console.log();
  }
}

async function saveConfig(token) {
  const configuration = {
    _: `This is your ${PACKAGE.name} credentials. DO NOT SHARE!`,
    token: token,
  };

  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(configuration), 'utf8');

  return true;
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

function loadConfig() {
  const configExists = fs.existsSync(CONFIG_FILE);

  if (configExists) {
    let config = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = JSON.parse(config);

    return setConfig(config.token);
  } else {
    return false;
  }

  if (!config) return false;
}

module.exports = {
  printWelcome,
  saveConfig,
  loadConfig,
};
