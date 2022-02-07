#!/usr/bin/env bash

BRAVE_PATH=$(which brave-browser)
BRAVE_CODE=$?

# STDOUT will be like "Brave Browser 77.0.69.135"
if [ $BRAVE_CODE -eq 0 ]; then
  echo "$BRAVE_PATH"
  exit 0
else
  exit 1
fi
