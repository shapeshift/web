# @shapeshiftoss/market-service

> Getting market data through multiple different APIs

## Usage

```typescript
import { getDefaultMarketService } from '@shapeshiftoss/market-service'

const getAssetData = async () => {
    const assetData = await getDefaultMarketService().getAssetData(network, contractAddress)
}
```

## Hot Reloading

To enable hot reloading, you need to have [WML](https://github.com/wix/wml) and [Watchman](https://facebook.github.io/watchman/docs/install.html) installed.

- Once WML is installed, add link(s) from packages to corresponding node_modules in project, ie:

// TODO: update package name once lib is published
```bash
wml add ./Projects/lib/packages/market-service ./Projects/web/node_modules/@shapeshift/market-service
```

- Check packages are linked correctly by running `wml list`, you should see a response similar to this:
```bash
Links:
enabled (0) /Users/userName/projectFolder/lib/packages/market-service -> /Users/userName/projectFolder/web/node_modules/@shapeshift/market-service
```

- Start `WML`
```bash
wml start
```

Note: If you start `wml` and nothing happens, or you see an error, a common cause is watchman is not watching the linked directory. Try "watching" the directory that was linked

```bash
watchman watch [path-to-package]
```

- In a different terminal window, run the typescript server inside the package.

```bash
yarn dev
```
