#!/usr/bin/env bash

BRAVE_PATH=$(which brave-browser)
BRAVE_CODE=$?

if [ $BRAVE_CODE -eq 0 ]; then
  echo "$BRAVE_PATH"
  exit 0
else
  exit 1
fi
