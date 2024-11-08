# @shapeshiftoss/caip

This package is ShapeShift's partial implementation of [CAIPs](https://github.com/ChainAgnostic/CAIPs) - Chain Agnostic Improvement Protocols.
It is not exhaustive and is currently only used internally.

## ChainId (CAIP2) - Blockchain ID Specification

https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md

Usage

### `toChainId` | `toCAIP2`

```ts
const chainNamespace = CHAIN_NAMESPACE.Evm
const chainReference = CHAIN_REFERENCE.EthereumMainnet
const result = toChainId({ chainNamespace, chainReference })
expect(result).toEqual('eip155:1')
```

### `fromChainId` | `fromCAIP2`

```ts
const ethereumChainId = 'eip155:1'
const { chainNamespace, chainReference } = fromChainId(ethereumChainId)
expect(chainNamespace).toEqual(CHAIN_NAMESPACE.Evm)
expect(chainReference).toEqual(CHAIN_REFERENCE.EthereumMainnet)
```

## AccountId (CAIP10) - Blockchain ID Specification

https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-10.md

Usage

### `toAccountId` | `toCAIP10`

```ts
const chainNamespace = CHAIN_NAMESPACE.Evm
const chainReference = CHAIN_REFERENCE.EthereumMainnet
const chainId = toChainId({ chainNamespace, chainReference })
const account = '0xa44c286ba83bb771cd0107b2c1df678435bd1535'
const expectedAccountId = `${chainId}:${account}`
expect(toAccountId({ chainId, account })).toEqual('eip155:1:0xa44c286ba83bb771cd0107b2c1df678435bd1535')
expect(toAccountId({ chainNamespace, chainReference, account })).toEqual('eip155:1:0xa44c286ba83bb771cd0107b2c1df678435bd1535')
```

### `fromAccountId` | `fromCAIP10`

```ts
const accountId = 'eip155:1:0xa44c286ba83bb771cd0107b2c1df678435bd1535'
const { account, chainId, chainNamespace, chainReference } = fromAccountId(accountId)
expect(account).toEqual('0xa44c286ba83bb771cd0107b2c1df678435bd1535')
expect(chainNamespace).toEqual('eip155')
expect(chainReference).toEqual('1')
expect(chainId).toEqual('eip155:1')
```

## AssetId (CAIP19) - Asset Type and Asset ID Specification

https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-19.md

Usage

### `toAssetId` | `toCAIP19`

Ether

```ts
const chainNamespace = CHAIN_NAMESPACE.Evm
const chainReference = CHAIN_REFERENCE.EthereumMainnet
const chainId = toChainId({ chainNamespace, chainReference })
const assetNamespace = 'slip44'
const assetReference = ASSET_REFERENCE.Ethereum
expect(toAssetId({ chainNamespace, chainReference, assetNamespace, assetReference })).toEqual('eip155:1/slip44:60')
expect(toAssetId({ chainId, assetNamespace, assetReference })).toEqual('eip155:1/slip44:60')
```

ERC20 token

```ts
const chainNamespace = CHAIN_NAMESPACE.Evm
const chainReference = CHAIN_REFERENCE.EthereumMainnet
const chainId = toChainId({ chainNamespace, chainReference })
const assetNamespace = 'erc20'
const assetReference = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
expect(toAssetId({ chainNamespace, chainReference, assetNamespace, assetReference })).toEqual('eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d')
expect(toAssetId({ chainId, assetNamespace, assetReference })).toEqual('eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d')
```

### `fromAssetId` | `fromCAIP19`

Ether

```ts
const assetId = 'eip155:1/slip44:60'
const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } = fromAssetId(AssetId)
expect(chainNamespace).toEqual('eip155')
expect(chainReference).toEqual('1')
expect(chainId).toEqual('eip155:1')
expect(assetNamespace).toEqual('slip44')
expect(assetReference).toEqual('60')
```

ERC20 token

```ts
const assetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } = fromAssetId(AssetId)
expect(chainNamespace).toEqual('eip155')
expect(chainReference).toEqual('1')
expect(chainId).toEqual('eip155:1')
expect(assetNamespace).toEqual('erc20')
expect(assetReference).toEqual('0xc770eefad204b5180df6a14ee197d99d808ee52d')
```

## Adapters

Adapters map asset IDs and map them to vendor-specific (e.g. CoinGecko) IDs.

This allows us to use asset IDs internally and keep any vendor IDs at the boundary.

### Generate

To generate new static adapter data, run the following

```zsh
cd packages/caip
yarn generate
```

and commit the generated `adapter.json` files.

### Usage

```ts
console.log(coingeckoToAssetIds('shapeshift-fox-token'))

[eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d]

console.log(assetIdToCoingecko('bip122:000000000019d6689c085ae165831e93/slip44:0'))

bitcoin
```
