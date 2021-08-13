const { createOAuthDeviceAuth } = require('@octokit/auth-oauth-device');

const style = require('ansi-colors');
const ora = require('ora');
const clipboard = require('clipboardy');

const CLIENT_ID = 'ed7c193c5b64ee06192a';
const CLIENT_TYPE = 'oauth-app';
const SCOPE = 'delete_repo';

async function auth() {
  console.log(style.dim(`Sign in to GitHub:`));
  const spinner = ora();

  const auth = createOAuthDeviceAuth({
    clientType: CLIENT_TYPE,
    clientId: CLIENT_ID,
    scopes: [SCOPE],
    async onVerification(verification) {
      await console.log(
        `${style.bold(`Open:`)} ${style.cyan(
          style.underline(verification.verification_uri)
        )}`
      );
      await console.log(
        `${style.bold('Code:')} ${verification.user_code} ${style.dim(
          'Copied to clipboard!'
        )}`
      );
      clipboard.writeSync(verification.user_code);

      spinner.start();
    },
  });

  const { token } = await auth({ type: 'oauth' });
  process.env.GITHUB_TOKEN = token;
  spinner.stop();

  return true;
}

module.exports = {
  auth,
};
