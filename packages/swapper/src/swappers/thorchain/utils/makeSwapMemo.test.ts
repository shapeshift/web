import { makeSwapMemo } from './makeSwapMemo'

describe('makeSwapMemo', () => {
  it('should make a trade to usdc memo', () => {
    const memo = makeSwapMemo({
      buyAssetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      destinationAddress: '0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741',
      limit: '420'
    })
    expect(memo).toEqual(
      's:ETH.USDC-D19D4A2E9EB0CE3606EB48:0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741:420'
    )
  })
  it('should make a trade to eth memo', () => {
    const memo = makeSwapMemo({
      buyAssetId: 'eip155:1/slip44:60',
      destinationAddress: '0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741',
      limit: '420'
    })
    expect(memo).toEqual('s:ETH.ETH:0x8a65ac0E23F31979db06Ec62Af62b132a6dF4741:420')
  })
  it('should make a trade to btc memo', () => {
    const memo = makeSwapMemo({
      buyAssetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
      destinationAddress: 'bc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h',
      limit: '420'
    })
    expect(memo).toEqual('s:BTC.BTC:bc1qkw9g3tgv6m2gwc4x4hvdefcwt0uxeedfgag27h:420')
  })
})
