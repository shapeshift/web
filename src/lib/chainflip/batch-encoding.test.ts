import { describe, expect, it } from 'vitest'

import { ethAddressToScAccount } from '@/lib/chainflip/account'
import { encodeBatch, encodeRemoveLenderFunds, encodeWithdrawAsset } from '@/lib/chainflip/scale'

describe('batch encoding for withdraw+egress', () => {
  const cfUsdc = { chain: 'Ethereum' as const, asset: 'USDC' as const }
  const destAddress = '0x5daf465a9ccf64deb146eeae9e7bd40d6761c986'

  it('shows the scAccount derivation', () => {
    const sc = ethAddressToScAccount(destAddress)
    console.log('scAccount:', sc)
    expect(sc).toMatch(/^0x[0-9a-fA-F]+$/)
  })

  it('encodes removeLenderFunds(USDC, null) for full withdrawal', () => {
    const encoded = encodeRemoveLenderFunds(cfUsdc, null)
    console.log('removeLenderFunds(USDC, null):', encoded)
    console.log('  pallet:', encoded.slice(0, 4), '(0x35 = 53 = LENDING_POOLS)')
    console.log('  call:', encoded.slice(4, 6), '(0x06 = RemoveLenderFunds)')
    console.log('  asset discriminant:', encoded.slice(6, 8), '(0x03 = Usdc)')
    console.log('  amount Option:', encoded.slice(8, 10), '(0x00 = None)')
    expect(encoded).toMatch(/^0x3506/)
  })

  it('encodes withdrawAsset(300000, USDC, Eth(0x5daf...))', () => {
    // 0.3 USDC = 300000 base units (6 decimals)
    const encoded = encodeWithdrawAsset('300000', cfUsdc, {
      chain: 'Ethereum',
      address: destAddress,
    })
    console.log('withdrawAsset(300000, USDC, Eth):', encoded)
    console.log('  pallet:', encoded.slice(0, 4), '(0x1f = 31 = LIQUIDITY_PROVIDER)')
    console.log('  call:', encoded.slice(4, 6), '(0x01 = WithdrawAsset)')
    expect(encoded).toMatch(/^0x1f01/)
    // Should contain the ETH address bytes
    expect(encoded.toLowerCase()).toContain('5daf465a9ccf64deb146eeae9e7bd40d6761c986')
  })

  it('encodes batch [removeLenderFunds, withdrawAsset]', () => {
    const removeCall = encodeRemoveLenderFunds(cfUsdc, null)
    const egressCall = encodeWithdrawAsset('300000', cfUsdc, {
      chain: 'Ethereum',
      address: destAddress,
    })

    console.log('removeCall length (hex chars):', (removeCall.length - 2) / 2, 'bytes')
    console.log('egressCall length (hex chars):', (egressCall.length - 2) / 2, 'bytes')

    const batch = encodeBatch([removeCall, egressCall])
    console.log('batch:', batch)
    console.log('  pallet:', batch.slice(0, 4), '(0x02 = Environment)')
    console.log('  call:', batch.slice(4, 6), '(0x0b = Batch)')
    console.log('  vector compact length:', batch.slice(6, 8))

    // The batch should start with 0x020b (Environment::Batch)
    expect(batch).toMatch(/^0x020b/)

    // It should contain both inner calls
    expect(batch).toContain(removeCall.slice(2)) // removeCall without 0x prefix
    expect(batch).toContain(egressCall.slice(2)) // egressCall without 0x prefix
  })

  it('verifies batch encoding matches Vec<RuntimeCall> format (no per-element length prefix)', () => {
    const removeCall = encodeRemoveLenderFunds(cfUsdc, null)
    const egressCall = encodeWithdrawAsset('300000', cfUsdc, {
      chain: 'Ethereum',
      address: destAddress,
    })
    const batch = encodeBatch([removeCall, egressCall])

    // Expected structure: 02 0b 08 [removeCall bytes] [egressCall bytes]
    // 02 = Environment pallet
    // 0b = Batch call (11)
    // 08 = compact(2) = 2 elements
    // Then raw concatenated call bytes (no per-element length prefix)
    const expected = '0x020b08' + removeCall.slice(2) + egressCall.slice(2)
    expect(batch).toBe(expected)
  })
})
