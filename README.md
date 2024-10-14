# ShapeShift DAO Web Interface

This project was bootstrapped with
[Create React App](https://github.com/facebook/create-react-app).

[![ShapeShift](https://img.shields.io/badge/ShapeShift%20DAO-Web-386ff9?logo=data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iNTdweCIgaGVpZ2h0PSI2MnB4IiB2aWV3Qm94PSIwIDAgNTcgNjIiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDU1LjEgKDc4MTM2KSAtIGh0dHBzOi8vc2tldGNoYXBwLmNvbSAtLT4KICAgIDx0aXRsZT5NYXJrPC90aXRsZT4KICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBTa2V0Y2guPC9kZXNjPgogICAgPGcgaWQ9Ik1vY2stVXBzIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KICAgICAgICA8ZyBpZD0iTGFuZGluZy1QYWdlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNzY5LjAwMDAwMCwgLTc2LjAwMDAwMCkiIGZpbGw9IiNGRkZGRkUiPgogICAgICAgICAgICA8ZyBpZD0iTmF2IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg3OS4wMDAwMDAsIDY5LjAwMDAwMCkiPgogICAgICAgICAgICAgICAgPGcgaWQ9IlNTX2hvcml6b250YWxfV2hpdGUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDY5MC4wNTY4MDAsIDcuNTgxNDUxKSI+CiAgICAgICAgICAgICAgICAgICAgPGcgaWQ9Ik1hcmsiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAuNDM0Mzk1LCAwLjM1NjgwOCkiPgogICAgICAgICAgICAgICAgICAgICAgICA8cGF0aCBkPSJNNTEuNjY5Njg1Myw1LjEwMzg0NDE5IEw0OC45Njk3MzM5LDIxLjI5OTQ3NzkgTDM5LjM3MDY4MjcsOS45OTYyMTIxMiBMNTEuNjY5Njg1Myw1LjEwMzg0NDE5IFogTTQ5LjAyNzkzMjYsMjguMjY1MTUxNSBMNTEuNDMwODM4MSwzNy4xNDE1NjQzIEwzMy4wNTcyOTQxLDQyLjIwNDQxNzUgTDQ5LjAyNzkzMjYsMjguMjY1MTUxNSBaIE05LjAzMTAzMjQzLDIzLjgwNDEyMDYgTDE4Ljg4MTk2NzMsMTAuOTI3ODI1NiBMMzUuOTg5MTA4OSwxMC45Mjc4MjU2IEw0Ni45MjM0Njk3LDIzLjgwNDEyMDYgTDkuMDMxMDMyNDMsMjMuODA0MTIwNiBaIE00NS42NTcwNjcyLDI2Ljk4NTU4MDUgTDI3Ljg0NTAyMzcsNDIuNTMwOTQ4IEw5LjcwMjg3NzU1LDI2Ljk4NTU4MDUgTDQ1LjY1NzA2NzIsMjYuOTg1NTgwNSBaIE0xNS41ODMyNjgzLDEwLjAwNTUyODMgTDYuNzgwODQwMTUsMjEuNTEwOTU0MSBMNC4wNzc2Mjk2Myw1LjE2NjI2MjI5IEwxNS41ODMyNjgzLDEwLjAwNTUyODMgWiBNMjIuNTY5NDMzMyw0Mi4xOTkyOTM2IEw0LjAyMDgyNzc2LDM3LjE0NTc1NjYgTDYuNTYyNDc4ODQsMjguNDg0MDgwNyBMMjIuNTY5NDMzMyw0Mi4xOTkyOTM2IFogTTI1Ljk5NDMwNjksNDYuNDI5NzUwMiBMMjIuNDkyNjExMSw1MC4yODQzMDA4IEMxOS41MjU0MTE1LDQ3LjQ2NDc3MjcgMTYuMjYzMDI4NCw0NC45NjEwNjE2IDEyLjc4MDQyMTcsNDIuODI5NTMwMSBMMjUuOTk0MzA2OSw0Ni40Mjk3NTAyIFogTTQyLjk3ODA2NzQsNDIuNzcwODM4NSBDMzkuNDk1NDYwNiw0NC45MzY4Mzk3IDM2LjI0MDk5MjYsNDcuNDczMTU3MiAzMy4yOTI0MTY2LDUwLjMxOTcwMjEgTDI5LjcxNjY5MjEsNDYuNDI0NjI2MyBMNDIuOTc4MDY3NCw0Mi43NzA4Mzg1IFogTTU1LjczNDI3ODQsMC4wNjI4ODM5MDY2IEwzNi40MTk3Nzg4LDcuNzQ2MzY1NjggTDE4LjQxNzc3NSw3Ljc0NjM2NTY4IEw5Ljk0NzU5ODNlLTE0LC04LjE3MTI0MTQ2ZS0xNCBMNC4xODM3ODM5NiwyNS4yOTU2MzM3IEwwLjE2NjIxNTMyMSwzOC45ODgwMjIxIEwxMC42NDgwMjM1LDQ1LjI1NzMxNDcgQzE1LjYxMDczODEsNDguMjI1OTAwOSAyMC4wNTYxODMxLDUxLjk0MDI0MzcgMjMuODYwNTExOSw1Ni4yOTY0NjgxIEwyNy45NDE4NjYzLDYwLjk2OTkwNjggTDMyLjIyNTI4NjMsNTYuMDU1MTgwMiBDMzUuOTAwNjQ2OSw1MS44Mzc3NjYyIDQwLjE4MDgwNzgsNDguMjE3NTE2NCA0NC45NDY1NzgyLDQ1LjI5NDU3OTIgTDU1LjIyNTg1NTEsMzguOTg4MDIyMSBMNTEuNTIzOTU1OSwyNS4zMTQyNjYgTDU1LjczNDI3ODQsMC4wNjI4ODM5MDY2IEw1NS43MzQyNzg0LDAuMDYyODgzOTA2NiBaIiBpZD0iRmlsbC0xNiI+PC9wYXRoPgogICAgICAgICAgICAgICAgICAgIDwvZz4KICAgICAgICAgICAgICAgIDwvZz4KICAgICAgICAgICAgPC9nPgogICAgICAgIDwvZz4KICAgIDwvZz4KPC9zdmc+)](https://shapeshift.com) [![ShapeShift](https://img.shields.io/badge/License-MIT-brightgreen)](https://github.com/shapeshift/web/blob/develop/LICENSE.md) [![ShapeShift](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/shapeshift/web/pulls)
[![ShapeShift](https://img.shields.io/discord/539606376339734558.svg?label=discord&logo=discord&logoColor=white)](https://discord.gg/shapeshift)
[![GitPOAP Badge](https://public-api.gitpoap.io/v1/repo/shapeshift/web/badge)](https://www.gitpoap.io/gh/shapeshift/web)

ShapeShift's OSS 2nd generation Web application. (Under Development)

## Table Of Contents

- [Helpful Docs](#helpful-docs)
- [Resources](#resources)
- [Requirements](#requirements)
- [Debugging](#debugging)
- [Quick Start](#quick-start)
- [Commands](#commands)
- [Developer Onboarding](#developer-onboarding)
- [Releases](#releases)
- [MixPanel](#mixpanel)
        
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

## Requirements

- [Node.js](https://nodejs.org/). Use a node version manager like `nvm` or check `.nvmrc` for the version.
- [OpenJDK](https://openjdk.java.net/install/). Required for [openapi-generator-cli](https://openapi-generator.tech/docs/installation/) to generate API clients from OpenAPI specs.

## Debugging

- [Rerenders](docs/rerenders.md)

## Quick Start

If you are using Linux and macOS it works out of the box following these steps:

1. Clone the repo

    > On Windows, _[Windows Subsystem for Linux](https://learn.microsoft.com/en-us/windows/wsl/)_ (WSL) is required. Make sure to store your clone of the repo on the WSL filesystem in order to avoid issues with line endings.
    >
    > Please do not ask our Engineering team for further help with WSL.

2. Make sure you are using the right Node.js version. This can optionally be done using a version manager like `nvm`:

    ```sh
    nvm use
    ```

3. Install [OpenJDK](https://openjdk.java.net/install/).

    >  On MacOS via homebrew `brew install java` should do the trick
    >  if you have [installed](https://openapi-generator.tech/docs/installation/) `brew install openapi-generator`, it should be installed automatically. 
    > Follow the commands to symlink the PATH for JDK & java
    > To verify a proper install and link check on the `java -version` and it should have openJDK versions displayed alongside java version.

4. Install Dependencies:

    ```sh
    yarn
    ```

    > This is short for `yarn install` ; be sure to use `yarn install --immutable` instead if you're setting up a CI pipeline or trying to duplicate a historical build.
5. Build Packages:

    ```sh
    yarn build:packages
    ```

6. Run `yarn env dev` to generate a `.env` file.

7. Other recommended configurations:

    To use the `.git-blame-ignore-revs` file to ignore specific commits, update the project's git configuration by running:

    ```sh
    git config --local blame.ignoreRevsFile .git-blame-ignore-revs
    ```

### Commands

To run the app in the development mode:

```sh
yarn dev
```

> It opens [http://localhost:3000](http://localhost:3000) to view it in the browser and the page will reload if you make edits.
>
> You will also see any lint errors in the console.  

<br/>

To launch the test runner in interactive watch mode:

```sh
yarn test
```

> See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.
>
> It also creates an HTML page you can interact with at the root level of the project in `/coverage`.

<br/>

To build the app for production in the `/build` folder at the root level of the project:

```sh
yarn build:web
```

> It correctly bundles React in production mode and optimizes the build for the best performance.
>
> The build is minified and the filenames include the hashes.
>
> Your app is ready to be deployed!
>
> See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Developer Onboarding

1. Create a pull request on GitHub. (You can do this at `https://github.com/<username>/<fork name>/pull/new/<branch name>`.)
2. Ensure you've followed the guidelines in [CONTRIBUTING.md](https://github.com/shapeshift/web/blob/main/CONTRIBUTING.md); in particular, make sure that the title of your PR conforms to the Conventional Commits format.
3. Post a link to your new pull request in `#engineering-prs` in the [Discord](https://discord.gg/shapeshift)
4. (optional) Return to the `develop` branch to get ready to start another task.

## Releases

The command `yarn release` helps to automate the release process.

Run the command and follow the prompts.

## MixPanel

MixPanel is used for non-private deployments of the interface.

We have a test MixPanel environment for developing and testing. To use this, update the `.env` file to include:

```sh
REACT_APP_MIXPANEL_TOKEN=dev-project-id
REACT_APP_FEATURE_MIXPANEL=true
```

The MixPanel project UI will now show events from your local session.
