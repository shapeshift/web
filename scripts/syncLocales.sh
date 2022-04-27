#!/bin/bash

set -e # abort on errors

# English locale file will always be considred as the source of truth. 
BASE_DIR="../src/assets/translations"
COMMON_ARGS=( "--srcLng=en" "--srcFormat=nested-json" "--targetFormat=nested-json" "--service=sync-without-translate" )


# execute npx binary if not installed locally
npx attranslate --version
cd "$BASE_DIR"

for d in */ ; do
    TARGET="${d%/}"
    if [ "$TARGET" == "en" ] ; then
        continue
    fi
    npx attranslate --srcFile=../translations/en/main.json --targetFile=../translations/$TARGET/main.json --targetLng=en "${COMMON_ARGS[@]}"
done

#echo "cd -"
#$SHELL # remove in live CI environment, only here to prevent window from closing after execution.