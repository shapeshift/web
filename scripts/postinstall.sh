#!/bin/bash
LOCK_HASH=$(sha1sum yarn.lock)
yarn minify
LOCK_HASH_AFTER=$(sha1sum yarn.lock)
if [ "$LOCK_HASH" != "$LOCK_HASH_AFTER" ]; then
  yarn
fi
yarn patch-package

