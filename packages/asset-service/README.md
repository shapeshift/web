# asset-service

This service provides all of the information needed to support an asset in the shapeshift open source app.

It does not provide asset market data (price, volume, etc) or wallet balance information.

## Usage

1. Run `cp sample.env .env` to create an env file. Feel free to edit values to services of your choosing.
2. Run `yarn generate` to build the `generatedAssetData.json` used by the the service to provide asset data.
3. Commit and push changes to `generatedAssetData.json` to github
4. Use assetService to lookup assets as needed.
