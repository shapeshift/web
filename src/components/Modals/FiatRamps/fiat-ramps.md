## Fiat ramp providers

Fiat ramp providers are defined in the `./config` file. each have some properties for visualization in the app and some functions for getting data from their API and pass an order to it.
`./fiatRampProviders/[fiatRampName].ts` should only contain util codes for a specific provider.
everything else in this directory should be generic.

### Adding a new fiat ramp

Generally to add a new fiat ramp provider, you should complement `SupportedFiatRampConfig` interface in the `./config` file. 
- The new provider should have a `getBuyAndSellList` async function to return a tuple containing the available assets for "selling" and "buying" in that provider. these arrays should return `FiatRampAsset[]` type which is defined in the `./FiatRampsCommon`.
- The new provider should have a `onSubmit` property for passing the data to the provider API.
- `isImplemeted` field is used to show whether the provider is ready to use or a `coming soon` text should be shown instead.


### NOTE
This whole structure is based on the assumption that user only should choose a provider and select an asset to buy or sell. with the same flow for any given provider. if a new provider needs extra steps to be implemented, a connect-wallet-like approach should be implemented.


