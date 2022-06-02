# rmnpm
A cool tool that saves you time if you want to remove your `node_modules` folder before running the ```npm install``` command.
 
 
### How does it do it?
By first moving the `node_modules` folder to a temporary location (`$TMPDIR`) it clears the room to start running `npm install` and simultaneously delete the old `node_modules` folder while the new modules are being installed.


### Installation
To install globally run:
```
npm install -g @itayavra/rmnpm
```


### Usage
In the root of your project, simply run `rmnpm` using:
```
rmnpm
```

Or (if not installed globally):
```
npx @itayavra/rmnpm
```


### Additional arguments
* `[-p | --pull]` - will run the `git pull --rebase` command before reinstalling all the packages
* `[-rl | --remove-lock-file]` - removes package-lock.json if exists
* `--use-lock-file` - uses an existing package-lock.js (running `npm ci --prefer-offline` instead of the `npm i` command)
* `--clear-cache` - resets the ‘Total time saved’ data
* `--quiet` - runs without showing any rmnpm logs (will still show the logs from the commands that run)


### Example usage
```
rmnpm -p -rl
```
