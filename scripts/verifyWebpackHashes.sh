#!/bin/bash

# Webpack files are named [chunkId].[hash].[ext]. They may include their own name on the first
# or last lines of the file, as a reference to an associated license or sourcemap respectively.
# When hashing the file, a placeholder value of [chunkId]..[ext] is used. This script finds all
# generated files with a hash in the name, strips it out of the first and last lines, and checks
# the hash in the filename.
#
# Checking that the files are named with their hashes confirms that the names are deterministic
# and reproducable.

# Find all files named [chunkId].[hash].[ext], but not their .map or .LICENSE.txt versions
find ./build/static -type f -regextype posix-extended -regex '.*\.[0-9a-f]{8}\.[^.]+' | {
  GOOD=0
  BAD=0
  while read -r FILE; do
    NAME="$(basename "$FILE")"
    # Take the filename ([chunkId].)([hash])(.[ext]) and get the middle group
    HASH="$(printf '%s' "$NAME" | sed -r 's/^(.*\.)([0-9a-f]{8})(\.[^.]+)$/\2/')"
    # Take the filename ([chunkId].)([hash])(.[ext]) and get the concatenation of the first and last groups
    STRIPPEDNAME="$(printf '%s' "$NAME" | sed -r 's/^(.*\.)([0-9a-f]{8})(\.[^.]+)$/\1\3/')"
    # Take the stripped filename and build a sed s///g command, escaping all instances of '.' to '\.'
    REPLACER="$(printf 's/%s/%s/g' "$NAME" "$STRIPPEDNAME" | sed -r 's/\./\./g')"
    # On the first and last lines of the file, run the replacer command to swap NAME with STRIPPEDNAME
    # Then hash that and truncate to the first 8 characters
    NEWHASH="$(sed -r "1${REPLACER};\$${REPLACER}" "$FILE" | shasum -a 256 | cut -d ' ' -f 1 | dd bs=8 count=1 status=none)"
    if [ "$HASH" = "$NEWHASH" ]; then
      GOOD=$((GOOD + 1))
    else
      printf '%s:\texpected hash %s, got %s\n' "$FILE" "$HASH" "$NEWHASH" 1>&2
      BAD=$((BAD + 1))
    fi
  done
  printf 'Filename hashes verified; %d good, %d bad.\n' "$GOOD" "$BAD"
  exit $BAD
}
