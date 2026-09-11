import type { Asset } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import { buildPaymentUri } from './paymentUri'

type TestAsset = Pick<Asset, 'assetId' | 'chainId' | 'precision'>

const asset = (assetId: string, chainId: string, precision: number): TestAsset => ({
  assetId,
  chainId,
  precision,
})

const BTC = asset(
  'bip122:000000000019d6689c085ae165831e93/slip44:0',
  'bip122:000000000019d6689c085ae165831e93',
  8,
)
const BCH = asset(
  'bip122:000000000000000000651ef99cb9fcbe/slip44:145',
  'bip122:000000000000000000651ef99cb9fcbe',
  8,
)
const ETH = asset('eip155:1/slip44:60', 'eip155:1', 18)
const BASE_ETH = asset('eip155:8453/slip44:60', 'eip155:8453', 18)
const USDC = asset('eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 'eip155:1', 6)
const FOX = asset('eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d', 'eip155:1', 18)
const SOL = asset(
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  9,
)
const WIF = asset(
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  6,
)
const TON = asset('ton:mainnet/slip44:607', 'ton:mainnet', 9)
const TON_USDT = asset(
  'ton:mainnet/jetton:EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
  'ton:mainnet',
  6,
)
const ATOM = asset('cosmos:cosmoshub-4/slip44:118', 'cosmos:cosmoshub-4', 6)

const BTC_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzz'
const EVM_ADDRESS = '0xAbC0000000000000000000000000000000000001'
const SOL_ADDRESS = 'GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW'
const TON_ADDRESS = 'UQBFtnj3-yYK4p7XqXsyC5LNxfL2Rm5m0m3F0pvfDy7YQ9tk'

describe('buildPaymentUri', () => {
  it('builds a BIP-21 uri with a decimal coin amount', () => {
    expect(
      buildPaymentUri({ address: BTC_ADDRESS, asset: BTC, amountCryptoPrecision: '0.05' }),
    ).toBe(`bitcoin:${BTC_ADDRESS}?amount=0.05`)
  })

  it('does not double-prefix a cashaddr that already carries its scheme', () => {
    const address = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y'
    expect(buildPaymentUri({ address, asset: BCH, amountCryptoPrecision: '1' })).toBe(
      'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y?amount=1',
    )
  })

  it('carries the chain id so an l2 deposit cannot be paid on mainnet', () => {
    expect(
      buildPaymentUri({ address: EVM_ADDRESS, asset: BASE_ETH, amountCryptoPrecision: '2' }),
    ).toBe(`ethereum:${EVM_ADDRESS}@8453?value=2e18`)
  })

  it('targets the contract and moves the destination into the call for an erc20', () => {
    expect(
      buildPaymentUri({ address: EVM_ADDRESS, asset: USDC, amountCryptoPrecision: '1.5' }),
    ).toBe(
      `ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48@1/transfer?address=${EVM_ADDRESS}&uint256=1.5e6`,
    )
  })

  it('keeps every digit of a full-precision erc20 amount', () => {
    expect(
      buildPaymentUri({
        address: EVM_ADDRESS,
        asset: FOX,
        amountCryptoPrecision: '123.123456789012345678',
      }),
    ).toBe(
      `ethereum:0xc770eefad204b5180df6a14ee197d99d808ee52d@1/transfer?address=${EVM_ADDRESS}&uint256=1.23123456789012345678e20`,
    )
    expect(
      buildPaymentUri({ address: EVM_ADDRESS, asset: USDC, amountCryptoPrecision: '0.000001' }),
    ).toBe(
      `ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48@1/transfer?address=${EVM_ADDRESS}&uint256=1`,
    )
  })

  it('builds a Solana Pay uri with ui units', () => {
    expect(
      buildPaymentUri({ address: SOL_ADDRESS, asset: SOL, amountCryptoPrecision: '1.5' }),
    ).toBe(`solana:${SOL_ADDRESS}?amount=1.5`)
  })

  it('names the mint and keeps the native account as recipient for an spl token', () => {
    expect(
      buildPaymentUri({ address: SOL_ADDRESS, asset: WIF, amountCryptoPrecision: '0.1' }),
    ).toBe(
      `solana:${SOL_ADDRESS}?amount=0.1&spl-token=EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm`,
    )
  })

  it('builds a ton transfer link in nanotons', () => {
    expect(
      buildPaymentUri({ address: TON_ADDRESS, asset: TON, amountCryptoPrecision: '1.5' }),
    ).toBe(`ton://transfer/${TON_ADDRESS}?amount=1500000000`)
  })

  it('names the jetton master and uses the jetton units for a jetton', () => {
    expect(
      buildPaymentUri({ address: TON_ADDRESS, asset: TON_USDT, amountCryptoPrecision: '5' }),
    ).toBe(
      `ton://transfer/${TON_ADDRESS}?jetton=EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs&amount=5000000`,
    )
  })

  it('uses the cosmos sdk scheme', () => {
    const address = 'cosmos1zqf0dq3nl3fhr8xk3pd2yq2sxwv0h2gd8qzptc'
    expect(buildPaymentUri({ address, asset: ATOM, amountCryptoPrecision: '1' })).toBe(
      `cosmos:${address}?amount=1`,
    )
  })

  it('falls back to the bare address on a chain with no scheme', () => {
    const address = '0x04a1b2c3'
    const starknet = asset('starknet:SN_MAIN/slip44:9004', 'starknet:SN_MAIN', 18)
    expect(buildPaymentUri({ address, asset: starknet, amountCryptoPrecision: '1' })).toBe(address)
  })

  it('omits the amount from schemes that need one, but keeps the evm chain id', () => {
    expect(buildPaymentUri({ address: BTC_ADDRESS, asset: BTC })).toBe(BTC_ADDRESS)
    expect(buildPaymentUri({ address: SOL_ADDRESS, asset: SOL })).toBe(SOL_ADDRESS)
    expect(buildPaymentUri({ address: TON_ADDRESS, asset: TON_USDT })).toBe(TON_ADDRESS)
    expect(buildPaymentUri({ address: EVM_ADDRESS, asset: BASE_ETH })).toBe(
      `ethereum:${EVM_ADDRESS}@8453`,
    )
  })

  it('passes a zero amount through', () => {
    expect(buildPaymentUri({ address: BTC_ADDRESS, asset: BTC, amountCryptoPrecision: '0' })).toBe(
      `bitcoin:${BTC_ADDRESS}?amount=0`,
    )
    expect(buildPaymentUri({ address: EVM_ADDRESS, asset: ETH, amountCryptoPrecision: '0' })).toBe(
      `ethereum:${EVM_ADDRESS}@1?value=0`,
    )
  })

  it('throws on a Solana address that is not a public key, as Solana Pay did', () => {
    expect(buildPaymentUri({ address: 'not-a-pubkey', asset: SOL })).toBe('not-a-pubkey')
    expect(() =>
      buildPaymentUri({ address: 'not-a-pubkey', asset: SOL, amountCryptoPrecision: '1' }),
    ).toThrow('Invalid Solana address')
    expect(() =>
      buildPaymentUri({ address: `${SOL_ADDRESS}1`, asset: SOL, amountCryptoPrecision: '1' }),
    ).toThrow('Invalid Solana address')
  })

  it('throws on an amount no wallet could pay', () => {
    expect(() =>
      buildPaymentUri({ address: BTC_ADDRESS, asset: BTC, amountCryptoPrecision: '-1' }),
    ).toThrow('Invalid payment amount')
    expect(() =>
      buildPaymentUri({ address: EVM_ADDRESS, asset: ETH, amountCryptoPrecision: 'abc' }),
    ).toThrow('Invalid payment amount')
  })
})
