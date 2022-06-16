#!/bin/bash -e

getConfigFromPath() {
  grep --exclude-dir .git --exclude-dir node_modules --include '*.ts' --include '*.tsx' -ERoh 'REACT_APP_[0-9A-Z_]*[0-9A-Z]\b' "$1" | sort -u
}

cd "$(dirname "$0")/.."

ACTIVE_PART_ONE="$(mktemp)"
ACTIVE_PART_TWO="$(mktemp)"
CONFIG_PART_ONE="$(mktemp)"
CONFIG_PART_TWO="$(mktemp)"
printf '\nexport const activePlugins = Object.freeze({\n' > "$ACTIVE_PART_TWO"
printf '\nexport const activePluginValidators = Object.freeze({\n' > "$CONFIG_PART_TWO"

{
  printf 'Collecting base config entries\n' 1>&2
  getConfigFromPath ./src/config.ts
  for ITEM in ./src/plugins/*; do
    [ -d "$ITEM" ] || continue
    PLUGIN_NAME="$(basename "$ITEM")"
    printf '%s' "$EXCLUDED_PLUGINS" | tr ',' '\n' | grep -Fxq "$PLUGIN_NAME" && continue
    if [ -f "$ITEM/index.tsx" ]; then
      printf 'import * as %s from '"'"'./%s'"'"'\n' "$PLUGIN_NAME" "$PLUGIN_NAME" >> "$ACTIVE_PART_ONE"
      printf '  %s,\n' "$PLUGIN_NAME" >> "$ACTIVE_PART_TWO"
    fi
    if [ -f "$ITEM/config.ts" ]; then
      printf 'Collecting config entries from %s plugin\n' "$PLUGIN_NAME" 1>&2
      getConfigFromPath "$ITEM/config.ts"
      printf 'import { validators as %sValidators } from '"'"'./%s/config'"'"'\n' "$PLUGIN_NAME" "$PLUGIN_NAME" >> "$CONFIG_PART_ONE"
      printf '  ...%sValidators,\n' "$PLUGIN_NAME" >> "$CONFIG_PART_TWO"
    elif [ -d "$ITEM/config" ]; then
      printf 'Collecting config entries from %s plugin\n' "$PLUGIN_NAME" 1>&2
      getConfigFromPath "$ITEM/config"
      printf 'import { validators as %sValidators } from '"'"'./%s/config'"'"'\n' "$PLUGIN_NAME" "$PLUGIN_NAME" >> "$CONFIG_PART_ONE"
      printf '  ...%sValidators,\n' "$PLUGIN_NAME" >> "$CONFIG_PART_TWO"
    fi
  done
} | sort -u | {
  printf '['
  sed -r 's/^(.*)$/"\1"/g' | tr '\n' ',' | sed -r 's/,$//'
  printf ']'
} > ./react-app-rewired/env_generated.json
yarn prettier -w ./react-app-rewired/env_generated.json

printf '})\n' >> "$ACTIVE_PART_TWO"
printf '})\n' >> "$CONFIG_PART_TWO"

cat "$ACTIVE_PART_ONE" "$ACTIVE_PART_TWO" > ./src/plugins/active_generated.ts
cat "$CONFIG_PART_ONE" "$CONFIG_PART_TWO" > ./src/plugins/config_generated.ts
rm -f "$ACTIVE_PART_ONE" "$ACTIVE_PART_TWO" "$CONFIG_PART_ONE" "$CONFIG_PART_TWO"
