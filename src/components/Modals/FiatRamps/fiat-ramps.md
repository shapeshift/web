## Fiat ramp providers

Fiat ramp providers are defined in the `./config` file. each have some properties for visualization in the app and some functions for getting data from their API and pass an order to it.
`./fiatRampProviders/[fiatRampName].ts` should only contain util codes for a specific provider.
everything else in this directory should be generic.

### Adding a new fiat ramp

Generally to add a new fiat ramp provider, you should complement `SupportedFiatRampConfig` interface in the `./config` file. 
- The new provider should have a `getBuyAndSellList` async function to return a tuple containing the available assets for "selling" and "buying" in that provider. these arrays should return `FiatRampAsset[]` type which is defined in the `./FiatRampsCommon`.
- The new provider should have a `onSubmit` property for passing the data to the provider API.
- `isImplemeted` field is used to show whether the provider is ready to use or a `coming soon` text should be shown instead.

You will also need to add a two-way mapping from ShapeShift AssetId <> ramp ticker / ID in the `@shapeshiftoss/caip` package, located in [packages/caip](https://github.com/shapeshift/web/tree/main/packages/caip).

This mapping serves two purposes:
- have a source of truth for the intersection of the assets ShapeShift and the ramp support
- be able to convert from our internal [`AssetId`](https://github.com/shapeshift/web/tree/main/packages/caip#assetid-caip19---asset-type-and-asset-id-specification)s to the ramp's ticker / ID, so we can build the payload/link to the ramp

See these commits for reference:
- [Banxa mapping](https://github.com/shapeshift/lib/commit/f24f9d800041534ae45a5196bb2030bba5f5864a)
- [Coinbase mapping](https://github.com/shapeshift/lib/commit/fb2cc5aafe74ac33d896f130952b4dcbfbf98e4a)

You can copy any of these commits, located in [packages/caip/src/adapters](https://github.com/shapeshift/web/tree/main/packages/caip/src/adapters) directory (Banxa and Coinbase are fiat ramp adapters there) and adapt it to the ramp you're integrating.

Refer to the documentation of the ramp you're integrating to find out the ID of the assets you're adding in this mapping.

### NOTE
This whole structure is based on the assumption that user only should choose a provider and select an asset to buy or sell. with the same flow for any given provider. if a new provider needs extra steps to be implemented, a connect-wallet-like approach should be implemented.
