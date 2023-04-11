import { abbreviateThorAssetId, makeSwapMemo } from './makeSwapMemo'

describe('makeSwapMemo', () => {
  it('should make a trade to usdc memo', () => {
    const memo = makeSwapMemo({
      buyAssetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      destinationAddress: '0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741',
      limit: '420',
    })
    expect(memo).toEqual('s:ETH.USDC-B48:0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741:420:ss:0')
  })

  it('should make a trade to eth memo', () => {
    const memo = makeSwapMemo({
      buyAssetId: 'eip155:1/slip44:60',
      destinationAddress: '0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741',
      limit: '420',
    })
    expect(memo).toEqual('s:ETH.ETH:0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741:420:ss:0')
  })

  it('should make a trade to btc memo', () => {
    const memo = makeSwapMemo({
      buyAssetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
      destinationAddress: 'bc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h',
      limit: '420',
    })
    expect(memo).toEqual('s:BTC.BTC:bc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h:420:ss:0')
  })
})

describe('abbreviateThorAssetId', () => {
  it('should abbreviate a long thor asset id', () => {
    const abbreviated = abbreviateThorAssetId('ETH.USDT-0xdac17f958d2ee523a2206206994597c13d831ec7')
    expect(abbreviated).toEqual('ETH.USDT-ec7')
  })

  it('should not abbreviate a native asset id', () => {
    const abbreviated = abbreviateThorAssetId('BTC/BTC')
    expect(abbreviated).toEqual('BTC/BTC')
  })
})
