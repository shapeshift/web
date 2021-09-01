# asset-service

This service provides all of the information needed to support an asset in the shapeshift open source app.

It does not provide asset market data \(price, volume, etc\) or wallet balance information.

## Usage

1. Run `yarn generate` to build the `generatedAssetData.json` used by the the service to provide asset data.
2. Commit and push changes to `generatedAssetData.json` to github
3. Use assetService to lookup assets as needed \(not yet built\)

