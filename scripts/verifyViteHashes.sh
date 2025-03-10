#!/bin/bash

SHA256SUMS_FILE="./build/SHA256SUMS"
BUILD_DIR="./build"

# This script verifies the content hashes of generated files to ensure deterministic builds.
find ./build/assets -type f | {
  GOOD=0
  BAD=0

  while read -r FILE; do
    NAME="$(basename "$FILE")"

    EXPECTED_HASH=$(echo "$NAME" | sed -r 's/.*-([A-Za-z0-9]{8})\.[^.]+$/\1/')
    ACTUAL_HASH=$(sha256sum "$FILE" | cut -d ' ' -f 1 | head -c 8)

    if [ "$EXPECTED_HASH" = "$ACTUAL_HASH" ]; then
      GOOD=$((GOOD + 1))
    else
      echo "❌ Hash mismatch for $FILE"
      echo "   Expected: $EXPECTED_HASH"
      echo "   Actual:   $ACTUAL_HASH"
      BAD=$((BAD + 1))
    fi
  done

  echo ""
  echo "=== File Hash Summary ==="
  echo "Valid files: $GOOD"
  echo "Invalid files: $BAD"
  echo ""

  exit $BAD
} 
