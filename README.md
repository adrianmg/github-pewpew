# github-pew-pew (v0.5.0)
🔫 Pew pew those unnecessary GitHub repos!

![Preview of the tool](preview.gif "Preview of the tool")

Have you ever had too much fun with the GitHub API and ended up creating too many dummy repositories? Me too 😅!

I made this little CLI tool over the weekend to clean up repositories quickly. I'm planning to add some flags and regexp to delete in bulk in the future. [Let me know](http://twitter.com/adrianmg) if that sounds interesting to you.

## Install

Simply run `npm install github-pewpew` and you are good to go. Remember you will need a PAT (Personal Access Token) to authenticate with your GitHub account.

You can generate a PAT scoped to 'delete_repo' on https://github.com/settings/tokens.

## Roadmap
- [ ] Improve auth so you don't need to grab the PAT every time you run the tool
- [ ] Advanced flags with: regex, --force
- [ ] Add testing

## Questions? Ideas? Bugs?

If you run into any issues or you'd like to share your thoughts, feel free to open a problem in this repository or hit me up on Twitter.

Thanks!
