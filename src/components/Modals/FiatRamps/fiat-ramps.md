## Fiat ramp providers

Fiat ramp providers are defined in the `./config` file. each have some properties for visualization in the app and some functions for getting data from their API and pass an order to it.
`./fiatRampProviders/[fiatRampName].ts` should only contain util codes for a specific provider.
everything else in this directory should be generic.

### Adding a new fiat ramp

Generally to add a new fiat ramp provider, you should complement `SupportedFiatRampConfig` interface in the `./config` file. 
- The new provider should have a `getBuyAndSellList` async function to return a tuple containing the available assets for "selling" and "buying" in that provider. these arrays should return `FiatRampAsset[]` type which is defined in the `./FiatRampsCommon`.
- The new provider should have a `onSubmit` property for passing the data to the provider API.
- `isImplemeted` field is used to show whether the provider is ready to use or a `coming soon` text should be shown instead.

You will also need to add a two-way mapping from ShapeShift AssetId <> ramp ticker / ID in the `@keepkey/caip` package, located in [lib](https://github.com/shapeshift/lib).
Refer to the README in that repo to work with lib packages locally.

This mapping serves two purposes:
- have a source of truth for the intersection of the assets ShapeShift and the ramp support
- be able to convert from our internal [`AssetId`](https://github.com/shapeshift/lib/tree/main/packages/caip#assetid-caip19---asset-type-and-asset-id-specification)s to the ramp's ticker / ID, so we can build the payload/link to the ramp

See these commits for reference:
- [Banxa mapping](https://github.com/shapeshift/lib/commit/f24f9d800041534ae45a5196bb2030bba5f5864a)
- [Gem mapping](https://github.com/shapeshift/lib/commit/78a8f14b82330239555ad544121ea956dd6ca8be)
- [Coinbase mapping](https://github.com/shapeshift/lib/commit/fb2cc5aafe74ac33d896f130952b4dcbfbf98e4a) (unused in [web](https://github.com/shapeshift/web))
- [OnJuno mapping](https://github.com/shapeshift/lib/commit/5fade1f998cc6224dd2cb5d076f26a4c485b649a)

You can copy any of these commits, located in lib's [packages/caip/src/adapters](https://github.com/shapeshift/lib/tree/main/packages/caip/src/adapters) directory (Banxa, Gem, Coinbase or JunoPay are all fiat ramp adapters there) and adapt it to the ramp you're integrating.

Refer to the documentation of the ramp you're integrating to find out the ID of the assets you're adding in this mapping.

### NOTE
This whole structure is based on the assumption that user only should choose a provider and select an asset to buy or sell. with the same flow for any given provider. if a new provider needs extra steps to be implemented, a connect-wallet-like approach should be implemented.


