const fs = require('fs');
const path = require('path');
const style = require('ansi-colors');

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

async function checkConfiguration() {
  const test = path.join(HOMEDIR, `com.${PACKAGE_AUTHOR}.${PACKAGE.name}`);
  console.log(HOMEDIR);
  console.log(test);
  await fs.readFile(HOMEDIR, (err, data) => {
    if (err) {
      throw err;
    }
    console.log(data);
    return data;
  });
}

module.exports = {
  printWelcome,
  saveConfig,
};
