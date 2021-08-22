<p align="center">
    <h1 align="center">🔫 github-pewpew</h1>
    <p align="center">Pew pew those unnecessary GitHub repos!<br>Clean up your unused repositories within seconds from your CLI.</p>
		<p align="center">
			<a href="https://badge.fury.io/js/github-pewpew"><img src="https://badge.fury.io/js/github-pewpew.svg" alt="npm version" height="18"></a>
		</p>
</p>

<p align="center">
	<br>
	<img src="./res/preview.gif" alt="Preview of the tool" width="700">
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


## Why?
Have you ever had too much fun with the GitHub API and ended up creating too many dummy repos? Me too 😅!

I made this little CLI tool to clean up repositories quickly. I'm planning to add some flags and regexp to delete in bulk in the future. [Let me know](http://twitter.com/adrianmg) if that sounds interesting to you.

## TODO
- `--force` flag to avoid confirmation
- `--regex` flag to delete repos matching a regex
- `--list` flag to delete repos from a comma-separated list

## Questions? Ideas? Bugs?

If you run into any issues or you'd like to share your thoughts, feel free to [open an issue](https://github.com/adrianmg/github-pewpew/issues) in this repository or hit me up on [Twitter](https://twitter.com/adrianmg).

## Development

To set up your environment to develop this tool, run `npm install`. You can run the tool by running `node index` in your terminal.

The file `src/github.js` contains the logic for the authentication  

and `src/utils.` files.

## License

The tool is available as open-source under the terms of the [MIT License](http://opensource.org/licenses/MIT).
