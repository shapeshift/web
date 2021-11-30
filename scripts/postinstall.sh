#!/bin/bash
# Different command for macOS and Linux
COMMAND="shasum"
# Fallback if we don't have "shasum" installed
if hash sha1sum 2> /dev/null; then
  COMMAND="sha1sum"
fi

LOCK_HASH=$($COMMAND yarn.lock)
yarn minify
LOCK_HASH_AFTER=$($COMMAND yarn.lock)

echo "[$LOCK_HASH] vs [$LOCK_HASH_AFTER]"
if [ "$LOCK_HASH" != "$LOCK_HASH_AFTER" ]; then
  yarn
fi
yarn patch-package

