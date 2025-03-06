#!/bin/bash

# This script verifies the content hashes of generated files to ensure deterministic builds.

# Find all files with a hash in the name (excluding source maps and manifests)
find ./build/assets -type f -regextype posix-extended -regex '.*\.[a-zA-Z0-9]{8,}\.(?:js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$' \
  -not -name "*.map" | {
  GOOD=0
  BAD=0
  while read -r FILE; do
    NAME="$(basename "$FILE")"
    # Extract the hash from the filename (matches the longer Vite hash format)
    HASH="$(printf '%s' "$NAME" | sed -r 's/^(.*\.)([a-zA-Z0-9]{8,})(\.[^.]+)$/\2/')"
    # Create stripped name without hash
    STRIPPEDNAME="$(printf '%s' "$NAME" | sed -r 's/^(.*\.)([a-zA-Z0-9]{8,})(\.[^.]+)$/\1\3/')"
    # Create sed replacer command
    REPLACER="$(printf 's/%s/%s/g' "$NAME" "$STRIPPEDNAME" | sed -r 's/\./\./g')"
    
    # Calculate hash of file content
    NEWHASH="$(sha256sum "$FILE" | cut -d ' ' -f 1 | dd bs=8 count=1 status=none)"
    
    if [ "${HASH:0:8}" = "$NEWHASH" ]; then
      GOOD=$((GOOD + 1))
    else
      printf '%s:\texpected hash %s, got %s\n' "$FILE" "${HASH:0:8}" "$NEWHASH" 1>&2
      BAD=$((BAD + 1))
    fi
  done
  printf 'Filename hashes verified; %d good, %d bad.\n' "$GOOD" "$BAD"
  exit $BAD
} 
