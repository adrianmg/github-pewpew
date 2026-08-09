<p align="center">
	<h1 align="center">
		<img src="./res/logo.png" alt="Logo" width="152">
		<br>
		github-pewpew
	</h1>
	<p align="center">Pew pew needless GitHub resources!<br>Clean up repositories, Codespaces, and gists from the CLI.</p>
	<p align="center">
		<a href="https://badge.fury.io/js/github-pewpew"><img src="https://badge.fury.io/js/github-pewpew.svg" alt="npm version" height="18"></a>
		<a href="https://justforfunnoreally.dev/"><img src="https://img.shields.io/badge/justforfunnoreally-dev-9ff" alt="Just for fun. No, really." height="18"></a>
	</p>
</p>

<p align="center">
	<br>
	<img src="./res/preview.gif" alt="Preview of the tool" width="600">
	<br>
</p>

## Installation and Usage

To install the latest version of github-pewpew CLI, run this command:

```
npm i -g github-pewpew
```

To quickly start using it, run the following command:

```
ghpew
```

Available commands:

```
ghpew repos
ghpew repos --archive
ghpew repos -a
ghpew repos --force
ghpew repos --regex '^adrianmg/demo-'
ghpew repos --list 'adrianmg/one,adrianmg/two'
ghpew repos --list 'adrianmg/one,adrianmg/two' --force
ghpew codespaces
ghpew gists
ghpew help
```

Repository selection is interactive by default. `--regex` uses a case-sensitive JavaScript
regular expression against each full `owner/repository` name; pass the pattern without `/`
delimiters. `--list` accepts exact, comma-separated `owner/repository` names and stops without
processing anything if a name is not available. Every selection mode asks for confirmation
unless `--force` is provided, and either filtering flag can be combined with `--archive`.
Because `--force` processes the selection immediately, review it carefully first.

Codespaces and gists use interactive multi-selection and always ask for confirmation before
deleting anything. Gists are identified by their description or first filename, visibility,
and unique ID. Gist deletion cannot be undone. The first run after upgrading may ask you to
sign in again so the CLI can request permission to manage gists.

## Why?

Have you ever had too much fun with GitHub and ended up creating too many throwaway
repositories, Codespaces, or gists? Me too 😅!

I made this little CLI tool to clean up GitHub clutter quickly. [Let me
know](http://twitter.com/adrianmg) what you think.

Do you want to know more? [Visit the official website](https://adrianmato.com/pewpew).

## Development

The important parts of the project are the following:

```
├── .github                GitHub Actions workflows and repo settings
├── src
│   ├── commands
│   │   ├── codespaces.js  Contains the command to delete codespaces
│   │   ├── gists.js       Contains the command to delete gists
│   │   └── repos.js       Contains the command to process repositories
│   ├── config.js          Contains the configuration manager
│   ├── github.js          Business logic: authentication and API calls
│   ├── repo-options.js    Parses and resolves repository selection options
│   ├── ui.js              CLI interactions
│   └── utils.js           Lightweight utility functions
├── test
│   └── test.js            Test coverage with the Node.js test runner
├── .prettierrc            Code formatting configuration
├── index.js               The main thread of execution
├── README.md              you're looking at it
```

To **set up your environment** to develop this tool, run:

- Install Node.js 20 or newer
- `npm install`
- `node index`

You can also run `node index DEV=true CLIENT_ID=<YOUR_TESTING_CLIENT_ID>` if you want to use your own client id for development and testing purposes.

The tests use the built-in Node.js test runner and can be run with `npm test`.

## Questions? Ideas? Bugs?

If you run into any issues or you'd like to share your thoughts, feel free to [open an issue](https://github.com/adrianmg/github-pewpew/issues) in this repository or hit me up on [Twitter](https://twitter.com/adrianmg).

## Contributions

Logo designed by [Rapha Lopes](https://twitter.com/raphaellopesph). Thanks to [@sergiou87](https://github.com/sergiou87), [@zschiller](https://github.com/zschiller), [@mamuso](https://github.com/mamuso), [@anishde12020](https://github.com/anishde12020), and [@jdvr](https://github.com/jdvr) for contributing with their feedback and ideas 🙇‍♂️.

## License

The tool is available as open-source under the terms of the [MIT License](http://opensource.org/licenses/MIT).
