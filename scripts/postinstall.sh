#!/bin/bash
# Different command for macOS and Linux
COMMAND="shasum -a 1"
# Fallback if we don't have "shasum" installed
if hash sha1sum 2> /dev/null; then
  COMMAND="sha1sum"
fi

LOCK_HASH=$($COMMAND yarn.lock | cut -d ' ' -f 1)
yarn minify
LOCK_HASH_AFTER=$($COMMAND yarn.lock | cut -d ' ' -f 1)

echo "Checking if yarn.lock has changed: [$LOCK_HASH] vs [$LOCK_HASH_AFTER]"
if [ "$LOCK_HASH" != "$LOCK_HASH_AFTER" ]; then
  echo "yarn-minify changed the yarn.lock file. Running yarn again..."
  yarn install --frozen-lockfile
else
  echo "yarn-minify did not modify the yarn.lock file"
fi

# Add web's git config to the local path in an idempotent way
git config --local include.path '../.gitconfig'

yarn patch-package
yarn typechain src/state/slices/opportunitiesSlice/resolvers/foxFarming/contracts/farmingAbi.json --target=ethers-v5 --out-dir ./src/state/slices/opportunitiesSlice/resolvers/foxFarming/contracts
yarn typechain src/features/defi/providers/fox-eth-lp/abis/IUniswapV2Router02.json --target=ethers-v5 --out-dir ./src/state/slices/opportunitiesSlice/resolvers/foxFarming/contracts
yarn typechain src/features/defi/providers/fox-eth-lp/abis/erc20abi.json --target=ethers-v5 --out-dir ./src/state/slices/opportunitiesSlice/resolvers/foxFarming/contracts
yarn typechain ./node_modules/@uniswap/v2-core/build/IUniswapV2Pair.json  --target=ethers-v5 --out-dir ./src/state/slices/opportunitiesSlice/resolvers/foxFarming/contracts
