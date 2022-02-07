#!/usr/bin/env bash

BRAVE_PATH=$(which brave-browser)
BRAVE_CODE=$?
BRAVE_VERSION=$($BRAVE_PATH --version 2> /dev/null)

if [ $BRAVE_CODE -eq 0 ]; then
  echo "$BRAVE_PATH"
  echo "${BRAVE_VERSION/Brave Browser/}"
  exit 0
else
  exit 1
fi
