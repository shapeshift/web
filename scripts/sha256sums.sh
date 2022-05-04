#!/bin/sh -e

rm -f ./build/SHA256SUMS
TEMP=$(mktemp)
find -L ./build -type f | xargs shasum -a 256 | sed -r 's/^([0-9a-f]{64}\s+)\.\/build\//\1/' | LC_ALL=C sort -k 2 | tee "$TEMP"
mv "$TEMP" ./build/SHA256SUMS
