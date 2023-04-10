# @shapeshiftoss/asset-service

This service provides all the information needed to support an asset in the shapeshift open source app.

It does not provide asset market data (price, volume, etc) or wallet balance information.

## Usage

1. Run `cp sample.env .env` to create an env file. Feel free to edit values to services of your choosing.
2. Run `yarn generate` to build the `generatedAssetData.json` used by the service to provide asset data.
3. Commit and push changes to `generatedAssetData.json` to GitHub
4. Use assetService to lookup assets as needed.

## Blacklist usage

You can contribute to blacklist a flagged token by adding its [caip19](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-19.md) to the [blacklist.json](https://github.com/shapeshift/lib/blob/main/packages/asset-service/src/generateAssetData/blacklist.json) list.

## Overriding the description of an asset

You can contribute to override the description of an asset by adding it to [descriptions.json](https://github.com/shapeshift/lib/blob/main/packages/asset-service/src/service/descriptions.json) list.
