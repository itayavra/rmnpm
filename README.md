# rmnpm

A cool tool that saves you time if you want to remove your `node_modules` folder before running the `npm install` command.

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

- `[-p | --pull]` - Update the code before reinstalling all the packages
- `[-r | --remove-lock-file]` - Remove the `package-lock.json` file if exists
- `[-l | --use-lock-file]` - Use a lock file, runs `npm ci --prefer-offline` instead of `npm i`
- `[-s | --skip-install]` - Remove the `node_modules` folder but skip running `npm i`
- `[-q | --quiet]` - Run without `rmnpm` logs (will still show the output of the commands it runs)
- `--clear-cache` - Clear the ‘Total time saved’ data

### Example usage
To update the code and remove the lock file before reinstalling all the packages, run:
```
rmnpm -p -r
```
