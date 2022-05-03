#!/bin/bash -e
# We must operate in the root directory because rollup insists on paths relative to it.
cd "$(dirname "$0")/.."

# rm -rf ./sw/bundle ./sw/dist
# mkdir -p ./sw/bundle ./sw/dist

# Rollup has an official typescript plugin, but I haven't been able to make it work properly.
yarn tsc -p ./sw
yarn rollup --file ./sw/bundle/sw.js --input ./sw/dist/sw.js --format iife --name self --extend --no-esModule --plugin node-resolve
yarn rollup --file ./sw/bundle/swStub.js --input ./sw/dist/swStub.js --format iife --name self --extend --no-esModule --plugin node-resolve
# Linting these is likely overkill, but it makes problems with these critical files easier to debug.
yarn eslint -c .eslintrc ./sw/bundle/sw.js ./sw/bundle/swStub.js --fix

# This "version hash" includes hashes of both sw.js and swStub.js, since it's important they always match.
SW_VERSION_HASH="$(shasum -a 256 ./sw/bundle/*.js | cut -d ' ' -f 1 | shasum -a 256 | cut -d ' ' -f 1)"
printf 'sw.js version hash: %s\n' "$SW_VERSION_HASH"
sed -ri "s%SW_VERSION_PLACEHOLDER%${SW_VERSION_HASH}%g" ./sw/bundle/sw.js ./sw/bundle/swStub.js
# Writing the version out in a separate file allows react-app-rewired to get it without having to mute stdout for everything above.
printf '%s\n' "$SW_VERSION_HASH" > ./sw/bundle/version.txt
