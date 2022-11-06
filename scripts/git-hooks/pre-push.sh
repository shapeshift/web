#!/bin/sh

echo "Running linter prior to push..."
yarn lint --fix
