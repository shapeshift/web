import { describe, expect, it } from 'vitest'

import type { Asset } from '../../types'
import { buildPaymentUri } from '../paymentUri'

const asset = (assetId: string, chainId: string, precision: number): Asset =>
  ({ assetId, chainId, precision, symbol: 'TEST', name: 'Test' }) as Asset

const BTC = asset('bip122:000000000019d6689c085ae165831e93/slip44:0', 'bip122:000000000019d6689c085ae165831e93', 8)
const BCH = asset('bip122:000000000000000000651ef99cb9fcbe/slip44:145', 'bip122:000000000000000000651ef99cb9fcbe', 8)
const ETH = asset('eip155:1/slip44:60', 'eip155:1', 18)
const BASE_ETH = asset('eip155:8453/slip44:60', 'eip155:8453', 18)
const USDC = asset('eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 'eip155:1', 6)
const SOL = asset('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', 9)
const USDC_SPL = asset(
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  6,
)
const ATOM = asset('cosmos:cosmoshub-4/slip44:118', 'cosmos:cosmoshub-4', 6)

describe('buildPaymentUri', () => {
  it('builds a BIP-21 uri with a decimal coin amount', () => {
    expect(buildPaymentUri('bc1qar0srrr7xfkvy5l643lydnw9re59gtzz', BTC, '5000000')).toBe(
      'bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzz?amount=0.05',
    )
  })

  it('does not double-prefix a cashaddr that already carries its scheme', () => {
    expect(buildPaymentUri('bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y', BCH, '100000000')).toBe(
      'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y?amount=1',
    )
  })

  it('builds an EIP-681 uri in atomic units for a native evm asset', () => {
    expect(buildPaymentUri('0xAbC0000000000000000000000000000000000001', ETH, '2014000000000000000')).toBe(
      'ethereum:0xAbC0000000000000000000000000000000000001@1?value=2014000000000000000',
    )
  })

  it('carries the chain id so an l2 deposit cannot be paid on mainnet', () => {
    expect(buildPaymentUri('0xAbC0000000000000000000000000000000000001', BASE_ETH, '1')).toBe(
      'ethereum:0xAbC0000000000000000000000000000000000001@8453?value=1',
    )
  })

  it('targets the contract and moves the deposit address into the call for an erc20', () => {
    expect(buildPaymentUri('0xAbC0000000000000000000000000000000000001', USDC, '1500000')).toBe(
      'ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48@1/transfer?address=0xAbC0000000000000000000000000000000000001&uint256=1500000',
    )
  })

  it('builds a Solana Pay uri with ui units', () => {
    expect(buildPaymentUri('GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW', SOL, '1500000000')).toBe(
      'solana:GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW?amount=1.5',
    )
  })

  it('names the mint for an spl token', () => {
    expect(buildPaymentUri('GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW', USDC_SPL, '2500000')).toBe(
      'solana:GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW?amount=2.5&spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    )
  })

  it('uses the cosmos sdk scheme the web app parses back', () => {
    expect(buildPaymentUri('cosmos1zqf0dq3nl3fhr8xk3pd2yq2sxwv0h2gd8qzptc', ATOM, '1000000')).toBe(
      'cosmos:cosmos1zqf0dq3nl3fhr8xk3pd2yq2sxwv0h2gd8qzptc?amount=1',
    )
  })

  it('falls back to the bare address on a chain with no scheme', () => {
    const address = '0x04a1b2c3'
    const starknet = asset('starknet:SN_MAIN/slip44:9004', 'starknet:SN_MAIN', 18)
    expect(buildPaymentUri(address, starknet, '1000000')).toBe(address)
  })
})
