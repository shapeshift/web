#!/bin/sh -e

rm -f ./dist/SHA256SUMS
TEMP=$(mktemp)
find -L ./dist -type f -not -name "SHA256SUMS" | xargs shasum -a 256 | sed -r 's/^([0-9a-f]{64}\s+)\.\/dist\//\1/' | LC_ALL=C sort -k 2 | tee "$TEMP"
mv "$TEMP" ./dist/SHA256SUMS
