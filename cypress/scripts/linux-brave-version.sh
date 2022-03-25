#!/usr/bin/env bash

# TODO - replace `which` with `/usr/bin/which` and test on Linux
BRAVE_PATH=$(/usr/bin/which brave-browser)
BRAVE_CODE=$?

if [ $BRAVE_CODE -eq 0 ]; then
  echo "$BRAVE_PATH"
  exit 0
fi
