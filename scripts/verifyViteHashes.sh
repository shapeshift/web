#!/bin/bash

SHA256SUMS_FILE="./build/SHA256SUMS"
BUILD_DIR="./build"

# This script verifies the content hashes of generated files to ensure deterministic builds.
find ./build/assets -type f -not -name "*.map" | {
  GOOD=0
  BAD=0

  while read -r FILE; do
    NAME="${FILE#$BUILD_DIR/}"

    EXPECTED_HASH=$(grep "$NAME" "$SHA256SUMS_FILE" | grep -v "\.map" | cut -d ' ' -f 1)
    ACTUAL_HASH=$(sha256sum "$FILE" | cut -d ' ' -f 1)

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
