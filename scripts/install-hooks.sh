#!/bin/bash

# TODO: This logic is admittedly pretty janky and can certainly be improved.

echo "Installing git hooks..."

cd scripts/git-hooks
for FILE in *; do
    chmod +x $FILE
    cd ../../.git/hooks
    ln -fs ../../scripts/git-hooks/${FILE} ./${FILE%%.*}
    cd -
    echo "Installed "${FILE%%.*}" script in .git/hooks"
done
