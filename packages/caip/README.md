# CAIPs

This package is ShapeShift's partial implementation of [CAIPs](https://github.com/ChainAgnostic/CAIPs) - Chain Agnostic Improvement Protocols.
It is not exhaustive and is currently only used internally.

## ChainId - Blockchain ID Specification

https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md

Usage

### `toChainId`

```ts
const chain = ChainTypes.Ethereum
const network = NetworkTypes.MAINNET
const result = toChainId({ chain, network })
expect(result).toEqual('eip155:1')
```

### `fromChainId`

```ts
const ethChainId = 'eip155:1'
const { chain, network } = fromChainId(ethChainId)
expect(chain).toEqual(ChainTypes.Ethereum)
expect(network).toEqual(NetworkTypes.MAINNET)
```

## AssetId - Asset Type and Asset ID Specification

https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-19.md

Usage

### `toAssetId`

Ether

```ts
const chain = ChainTypes.Ethereum
const network = NetworkTypes.MAINNET
const assetNamespace = AssetNamespace.Slip44
const assetReference = AssetReference.Ethereum
const result = toAssetId({ chain, network, assetNamespace, assetReference })
expect(result).toEqual('eip155:1/slip44:60')
```

ERC20 token

```ts
const chain = ChainTypes.Ethereum
const network = NetworkTypes.MAINNET
const contractType = AssetNamespace.ERC20
const tokenId = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
const result = toAssetId({ chain, network, contractType, tokenId })
expect(result).toEqual('eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d')
```

### `fromAssetId`

Ether

```ts
const assetId = 'eip155:1/slip44:60'
const { chain, network, contractType, tokenId } = fromAssetId(assetId)
expect(chain).toEqual(ChainTypes.Ethereum)
expect(network).toEqual(NetworkTypes.MAINNET)
expect(contractType).toEqual(AssetNamespace.Slip44)
expect(tokenId).toEqual(AssetReference.Ethereum)
```

ERC20 token

```ts
const assetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
const { chain, network, contractType, tokenId } = fromAssetId(assetId)
expect(chain).toEqual(ChainTypes.Ethereum)
expect(network).toEqual(NetworkTypes.MAINNET)
expect(contractType).toEqual(AssetNamespace.ERC20)
expect(tokenId).toEqual('0xc770eefad204b5180df6a14ee197d99d808ee52d')
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
console.log(coingeckoToAssetId('shapeshift-fox-token'))

eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d

console.log(assetIdToCoingecko('bip122:000000000019d6689c085ae165831e93/slip44:0'))

bitcoin
```
