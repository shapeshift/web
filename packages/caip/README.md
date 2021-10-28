# CAIPs

This package is ShapeShift's partial implementation of [CAIPs](https://github.com/ChainAgnostic/CAIPs) - Chain Agnostic Improvement Protocols.

It is not exhaustive and is currently only used internally.

## CAIP-2 - Blockchain ID Specification

https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md

Usage

### `toCAIP2`

```ts
const chain = ChainTypes.Ethereum
const network = NetworkTypes.MAINNET
const result = toCAIP2({ chain, network })
expect(result).toEqual('eip155:1')
```

### `fromCAIP2`

```ts
const ethCaip2 = 'eip155:1'
const { chain, network } = fromCAIP2(ethCaip2)
expect(chain).toEqual(ChainTypes.Ethereum)
expect(network).toEqual(NetworkTypes.MAINNET)
```

## CAIP-19 - Asset Type and Asset ID Specification

https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-19.md

Usage

### `toCAIP19`

Ether

```ts
const chain = ChainTypes.Ethereum
const network = NetworkTypes.MAINNET
const result = toCAIP19({ chain, network })
expect(result).toEqual('eip155:1/slip44:60')
```

ERC20 token

```ts
const chain = ChainTypes.Ethereum
const network = NetworkTypes.MAINNET
const contractType = ContractTypes.ERC20
const tokenId = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
const result = toCAIP19({ chain, network, contractType, tokenId })
expect(result).toEqual('eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d')
```

### `fromCAIP19`

Ether

```ts
const caip19 = 'eip155:1/slip44:60'
const { chain, network, contractType, tokenId } = fromCAIP19(caip19)
expect(chain).toEqual(ChainTypes.Ethereum)
expect(network).toEqual(NetworkTypes.MAINNET)
expect(contractType).toBeUndefined()
expect(tokenId).toBeUndefined()
```

ERC20 token

```ts
const caip19 = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
const { chain, network, contractType, tokenId } = fromCAIP19(caip19)
expect(chain).toEqual(ChainTypes.Ethereum)
expect(network).toEqual(NetworkTypes.MAINNET)
expect(contractType).toEqual(ContractTypes.ERC20)
expect(tokenId).toEqual('0xc770eefad204b5180df6a14ee197d99d808ee52d')
```

## Adapters

Adapters map CAIP-19 asset ids and map them to vendor-specific (e.g. CoinGecko) IDs.

This allows us to use CAIP-19 IDs internally and keep any vendor IDs at the boundary.

### Generate

To generate new static adapter data, run the following

```zsh
cd packages/caip
yarn generate
```

and commit the generated `adapter.json` files.

### Usage

```ts
console.log(coingeckoToCAIP19('shapeshift-fox-token'))

eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d

console.log(CAIP19ToCoingecko('bip122:000000000019d6689c085ae165831e93/slip44:0'))

bitcoin
```
