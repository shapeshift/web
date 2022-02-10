# ShapeShift DAO Web Interface

This project was bootstrapped with
[Create React App](https://github.com/facebook/create-react-app).

[![ShapeShift](https://img.shields.io/badge/ShapeShift%20DAO-Web-386ff9?logo=data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iNTdweCIgaGVpZ2h0PSI2MnB4IiB2aWV3Qm94PSIwIDAgNTcgNjIiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDU1LjEgKDc4MTM2KSAtIGh0dHBzOi8vc2tldGNoYXBwLmNvbSAtLT4KICAgIDx0aXRsZT5NYXJrPC90aXRsZT4KICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBTa2V0Y2guPC9kZXNjPgogICAgPGcgaWQ9Ik1vY2stVXBzIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KICAgICAgICA8ZyBpZD0iTGFuZGluZy1QYWdlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNzY5LjAwMDAwMCwgLTc2LjAwMDAwMCkiIGZpbGw9IiNGRkZGRkUiPgogICAgICAgICAgICA8ZyBpZD0iTmF2IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg3OS4wMDAwMDAsIDY5LjAwMDAwMCkiPgogICAgICAgICAgICAgICAgPGcgaWQ9IlNTX2hvcml6b250YWxfV2hpdGUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDY5MC4wNTY4MDAsIDcuNTgxNDUxKSI+CiAgICAgICAgICAgICAgICAgICAgPGcgaWQ9Ik1hcmsiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAuNDM0Mzk1LCAwLjM1NjgwOCkiPgogICAgICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNNTEuNjY5Njg1Myw1LjEwMzg0NDE5IEw0OC45Njk3MzM5LDIxLjI5OTQ3NzkgTDM5LjM3MDY4MjcsOS45OTYyMTIxMiBMNTEuNjY5Njg1Myw1LjEwMzg0NDE5IFogTTQ5LjAyNzkzMjYsMjguMjY1MTUxNSBMNTEuNDMwODM4MSwzNy4xNDE1NjQzIEwzMy4wNTcyOTQxLDQyLjIwNDQxNzUgTDQ5LjAyNzkzMjYsMjguMjY1MTUxNSBaIE05LjAzMTAzMjQzLDIzLjgwNDEyMDYgTDE4Ljg4MTk2NzMsMTAuOTI3ODI1NiBMMzUuOTg5MTA4OSwxMC45Mjc4MjU2IEw0Ni45MjM0Njk3LDIzLjgwNDEyMDYgTDkuMDMxMDMyNDMsMjMuODA0MTIwNiBaIE00NS42NTcwNjcyLDI2Ljk4NTU4MDUgTDI3Ljg0NTAyMzcsNDIuNTMwOTQ4IEw5LjcwMjg3NzU1LDI2Ljk4NTU4MDUgTDQ1LjY1NzA2NzIsMjYuOTg1NTgwNSBaIE0xNS41ODMyNjgzLDEwLjAwNTUyODMgTDYuNzgwODQwMTUsMjEuNTEwOTU0MSBMNC4wNzc2Mjk2Myw1LjE2NjI2MjI5IEwxNS41ODMyNjgzLDEwLjAwNTUyODMgWiBNMjIuNTY5NDMzMyw0Mi4xOTkyOTM2IEw0LjAyMDgyNzc2LDM3LjE0NTc1NjYgTDYuNTYyNDc4ODQsMjguNDg0MDgwNyBMMjIuNTY5NDMzMyw0Mi4xOTkyOTM2IFogTTI1Ljk5NDMwNjksNDYuNDI5NzUwMiBMMjIuNDkyNjExMSw1MC4yODQzMDA4IEMxOS41MjU0MTE1LDQ3LjQ2NDc3MjcgMTYuMjYzMDI4NCw0NC45NjEwNjE2IDEyLjc4MDQyMTcsNDIuODI5NTMwMSBMMjUuOTk0MzA2OSw0Ni40Mjk3NTAyIFogTTQyLjk3ODA2NzQsNDIuNzcwODM4NSBDMzkuNDk1NDYwNiw0NC45MzY4Mzk3IDM2LjI0MDk5MjYsNDcuNDczMTU3MiAzMy4yOTI0MTY2LDUwLjMxOTcwMjEgTDI5LjcxNjY5MjEsNDYuNDI0NjI2MyBMNDIuOTc4MDY3NCw0Mi43NzA4Mzg1IFogTTU1LjczNDI3ODQsMC4wNjI4ODM5MDY2IEwzNi40MTk3Nzg4LDcuNzQ2MzY1NjggTDE4LjQxNzc3NSw3Ljc0NjM2NTY4IEw5Ljk0NzU5ODNlLTE0LC04LjE3MTI0MTQ2ZS0xNCBMNC4xODM3ODM5NiwyNS4yOTU2MzM3IEwwLjE2NjIxNTMyMSwzOC45ODgwMjIxIEwxMC42NDgwMjM1LDQ1LjI1NzMxNDcgQzE1LjYxMDczODEsNDguMjI1OTAwOSAyMC4wNTYxODMxLDUxLjk0MDI0MzcgMjMuODYwNTExOSw1Ni4yOTY0NjgxIEwyNy45NDE4NjYzLDYwLjk2OTkwNjggTDMyLjIyNTI4NjMsNTYuMDU1MTgwMiBDMzUuOTAwNjQ2OSw1MS44Mzc3NjYyIDQwLjE4MDgwNzgsNDguMjE3NTE2NCA0NC45NDY1NzgyLDQ1LjI5NDU3OTIgTDU1LjIyNTg1NTEsMzguOTg4MDIyMSBMNTEuNTIzOTU1OSwyNS4zMTQyNjYgTDU1LjczNDI3ODQsMC4wNjI4ODM5MDY2IEw1NS43MzQyNzg0LDAuMDYyODgzOTA2NiBaIiBpZD0iRmlsbC0xNiI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDwvZz4KICAgICAgICAgICAgICAgIDwvZz4KICAgICAgICAgICAgPC9nPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+)](https://shapeshift.com) [![ShapeShift](https://img.shields.io/badge/License-MIT-brightgreen)](https://github.com/shapeshift/web/blob/develop/LICENSE.md) [![ShapeShift](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/shapeshift/web/pulls) [![ShapeShift](https://img.shields.io/discord/539606376339734558.svg?label=discord&logo=discord&logoColor=white)](https://discord.gg/shapeshift)

ShapeShift's OSS 2nd generation Web application. (Under Development)

## Table Of Contents

- [Helpful Docs](#helpful-docs)
- [Resources](#resources)
- [Dependencies](#dependencies)
- [Developer Onboarding](#developer-onboarding)
- [Commands](#commands)
- [Linking local dependencies](#linking)

## Helpful Docs

- [Architecture](docs/architecture.md)
- [File Structure](docs/file-structure.md)
- [Folder Structure](docs/folder-structure.md)
- [Globally Shared Code](docs/globally-shared-code.md)
- [State Management](docs/state-management.md)
- [Styles](docs/styles.md)
- [Testing](docs/testing.md)
- [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)

## Resources

- [shapeshift](https://shapeshift.com/developer-portal)

## Dependencies
- [hdwallet](https://github.com/shapeshift/hdwallet)
- [lib](https://github.com/shapeshift/lib)
- [unchained](https://github.com/shapeshift/unchained)
- [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) (optional; must be installed manually)

## Quick Start

On Linux and MacOS it works out of the box following the steps.<br/>
⚠️ On Windows you should use the _Windows Subsystem for Linux_ (WSL).

- Clone the repo

- (optional) Make sure you're using the right Node.js version.

  ```sh
  nvm use
  ```

- Install Dependencies:

  ```sh
  # This is short for `yarn install`; be sure to use `yarn install --frozen-lockfile` instead if you're setting up a CI pipeline or trying to duplicate a historical build.
  yarn
  ```

- Copy `sample.env` to `.env`, and configure it according to the [.env section](#.env) below.

  ```sh
  cp sample.env .env
  ```

### .env

The `.env` file contains environment variables that the program needs to function properly. 

- `REACT_APP_PORTIS_DAPP_ID`

  Allows you to connect a Portis wallet. Without this the program will hang after choosing Portis and clicking the "Pair" button. Portis Dapp IDs aren't secret, but they are domain-specific.

- `REACT_APP_ETHEREUM_NODE_URL`

  Needed for certain Defi integrations such as Yearn; the app will malfunction when connecting a wallet without it.

  Any Ethereum node should do, but you can get your own node URL for testing by doing the following:

  1. Go to https://infura.io/dashboard
  2. Set up a free account
  3. Make a new project

      Your key should use "JSON-RPC over HTTPS" and look like this: `https://mainnet.infura.io/v3/<your project id>`

### Commands

Runs the app in the development mode.<br /> Open
[http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br /> You will also see any lint errors
in the console.

```sh
    yarn dev
```

Launches the test runner in the interactive watch mode.<br /> See the section
about
[running tests](https://facebook.github.io/create-react-app/docs/running-tests)
for more information.
It also creates a html page you can interact with at the root level of the project in `/coverage`.

```sh
    yarn test
```

Starts Cypress E2E testing with GUI.

```
yarn test:cypress
```

Or run Cypress headless

```
test:cypress:headless
```

Builds the app for production to the `build` folder.<br /> It correctly bundles
React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br /> Your app is
ready to be deployed!

See the section about
[deployment](https://facebook.github.io/create-react-app/docs/deployment) for
more information.

```sh
    yarn build
```

Runs the component documentation.<br /> Open
[http://localhost:6006](http://localhost:6006) to view it in the browser.

```sh
    yarn storybook
```

### Linking

If you're developing locally in this web repository, and need to make changes affecting packages in lib 
or unchained (backend), use the following steps to link packages locally for developing. 
If your changes only touch web these steps are not necessary.

1. Clone lib and unchained repos
3. Go into lib and run yarn link - you only have to do this the first time to get things setup
4. Go into unchained, then cd packages/client and yarn link, then do the same in packages/parser - again, this only has to be done the initial time
5. If you're working in web and need to make changes in lib or unchained, run yarn link-packages in web to use local versions of them
6. `yarn show-linked-packages` will show what's currently linked
7. If you're done developing locally `yarn unlink-packages` to use published upstream versions

Now your web's chain-adapters have a symlink to your lib's

## Developer Onboarding
1. Create a pull request on Github. (You can do this at `https://github.com/<username>/<fork name>/pull/new/<branch name>`.)
2. Ensure you've followed the guidelines in [CONTRIBUTING.md](https://github.com/shapeshift/web/blob/main/CONTRIBUTING.md); in particular, make sure that the title of your PR conforms to the Conventional Commits format.
3. Post a link to your new pull request in `#engineering-prs` in the [Discord](https://discord.gg/shapeshift)
4. (optional) Return to the `develop` branch to get ready to start another task.

## Releases
The script `./scripts/release.sh` helps to automate the release process.

### Create a release branch
`yarn create-release v1.1.1`
or
`./scripts/release.sh release v1.1.1`

This creates a `releases/v1.1.1` branch based on `origin/develop` and pushes it to origin

### Merge a release into main
`yarn merge-release v1.1.1`
or
`./scripts/release.sh main v1.1.1`

This does a checkout of `origin/releases/v1.1.1` then merges that to `main`. After a confirmation prompt, it pushes that to `origin/main`.

