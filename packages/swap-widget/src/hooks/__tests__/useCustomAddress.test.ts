import { arbitrumChainId, bchChainId, btcChainId, ethChainId } from '@shapeshiftoss/caip'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useCustomAddress } from '../useCustomAddress'

const BTC = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'
const ETH = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'

const render = (chainId: string) =>
  renderHook(({ chainId }) => useCustomAddress(chainId), { initialProps: { chainId } })

describe('useCustomAddress', () => {
  it('keeps an evm address across evm chains', () => {
    const { result, rerender } = render(ethChainId)
    act(() => result.current[1](ETH))
    rerender({ chainId: arbitrumChainId })
    expect(result.current[0]).toBe(ETH)
  })

  it('retires a bitcoin address on bitcoin cash even though the format is shared', () => {
    const { result, rerender } = render(btcChainId)
    act(() => result.current[1](BTC))
    rerender({ chainId: bchChainId })
    expect(result.current[0]).toBe('')
  })

  it('does not resurface an address after a round trip through another chain', () => {
    const { result, rerender } = render(ethChainId)
    act(() => result.current[1](ETH))
    rerender({ chainId: btcChainId })
    rerender({ chainId: ethChainId })
    expect(result.current[0]).toBe('')
  })

  it('holds an address restored for a chain not yet shown until the chain catches up', () => {
    const { result, rerender } = render(ethChainId)
    act(() => result.current[1](BTC, btcChainId))
    expect(result.current[0]).toBe('')
    rerender({ chainId: btcChainId })
    expect(result.current[0]).toBe(BTC)
  })

  it('keeps one setter identity across chain changes', () => {
    const { result, rerender } = render(ethChainId)
    const setter = result.current[1]
    rerender({ chainId: btcChainId })
    expect(result.current[1]).toBe(setter)
  })
})
