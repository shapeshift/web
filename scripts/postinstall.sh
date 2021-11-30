#!/bin/bash
# Different command for macOS and Linux
COMMAND="sha1sum"
# Check if we're running macOS
if hash shasum 2> /dev/null; then
  COMMAND="shasum"
fi

LOCK_HASH=$($COMMAND yarn.lock)
yarn minify
LOCK_HASH_AFTER=$($COMMAND yarn.lock)

echo "[$LOCK_HASH] vs [$LOCK_HASH_AFTER]"
if [ "$LOCK_HASH" != "$LOCK_HASH_AFTER" ]; then
  yarn
fi
yarn patch-package

