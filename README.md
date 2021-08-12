<p align="center">
    <h1 align="center">🔫 github-pewpew</h1>
    <p align="center">Pew pew those unnecessary GitHub repos!<br>Clean up your unused repositories within seconds from your CLI.</p>
		<p align="center">
			<a href="https://badge.fury.io/js/github-pewpew"><img src="https://badge.fury.io/js/github-pewpew.svg" alt="npm version" height="18"></a>
		</p>
</p>

<p align="center">
	<br>
	<img src="preview.gif" alt="Preview of the tool" width="550">
	<br>
</p>

Have you ever had too much fun with the GitHub API and ended up creating too many dummy repos? Me too 😅!

I made this little CLI tool over the weekend to clean up repositories quickly. I'm planning to add some flags and regexp to delete in bulk in the future. [Let me know](http://twitter.com/adrianmg) if that sounds interesting to you.

## Installation and usage

Install it via `npm install github-pewpew` and use it running the command `ghpew` in your terminal.

Remember you will need a PAT (Personal Access Token) to authenticate with your GitHub account. You can generate a PAT scoped to 'delete_repo' on https://github.com/settings/tokens.

## Roadmap
- Improve auth so you don't need to grab the PAT every time you run the tool
- Advanced flags with: regex, --force
- Add testing

## Questions? Ideas? Bugs?

If you run into any issues or you'd like to share your thoughts, feel free to [open an issue](https://github.com/adrianmg/github-pewpew/issues) in this repository or hit me up on [Twitter](https://twitter.com/adrianmg).

## Development

To set up your environment to develop this tool, run `npm install`. You can run the tool by running `node index` in your terminal. Most of the functionality is in the `src/utils.js` file.

You can also rename `.example.env	` to `.env` and add your PAT to it to speed up debugging.

## License

The tool is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).
