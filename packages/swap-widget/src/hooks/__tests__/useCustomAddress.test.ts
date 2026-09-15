import { CHAIN_NAMESPACE, CHAIN_REFERENCE, toChainId } from '@shapeshiftoss/caip'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useCustomAddress } from '../useCustomAddress'

const btcChainId = toChainId({
  chainNamespace: CHAIN_NAMESPACE.Utxo,
  chainReference: CHAIN_REFERENCE.BitcoinMainnet,
})
const dogeChainId = toChainId({
  chainNamespace: CHAIN_NAMESPACE.Utxo,
  chainReference: CHAIN_REFERENCE.DogecoinMainnet,
})
const ethChainId = toChainId({
  chainNamespace: CHAIN_NAMESPACE.Evm,
  chainReference: CHAIN_REFERENCE.EthereumMainnet,
})
const arbChainId = toChainId({
  chainNamespace: CHAIN_NAMESPACE.Evm,
  chainReference: CHAIN_REFERENCE.ArbitrumMainnet,
})
const nearChainId = toChainId({
  chainNamespace: CHAIN_NAMESPACE.Near,
  chainReference: CHAIN_REFERENCE.NearMainnet,
})

const BTC = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'
const ETH = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'

describe('useCustomAddress', () => {
  it('exposes an address entered for the current chain', () => {
    const { result } = renderHook(() => useCustomAddress(btcChainId))
    act(() => result.current[1](BTC))
    expect(result.current[0]).toBe(BTC)
  })

  it('keeps an address across chains of the same family where it still validates', () => {
    const { result, rerender } = renderHook(({ chainId }) => useCustomAddress(chainId), {
      initialProps: { chainId: ethChainId },
    })
    act(() => result.current[1](ETH))
    rerender({ chainId: arbChainId })
    expect(result.current[0]).toBe(ETH)
  })

  it('hides an address on a chain of the same family where it does not validate', () => {
    const { result, rerender } = renderHook(({ chainId }) => useCustomAddress(chainId), {
      initialProps: { chainId: btcChainId },
    })
    act(() => result.current[1](BTC))
    rerender({ chainId: dogeChainId })
    expect(result.current[0]).toBe('')
  })

  it('hides an address on another chain family even where its validator would accept it', () => {
    const { result, rerender } = renderHook(({ chainId }) => useCustomAddress(chainId), {
      initialProps: { chainId: btcChainId },
    })
    act(() => result.current[1](BTC))
    rerender({ chainId: nearChainId })
    expect(result.current[0]).toBe('')
  })

  it('records the chain an address was restored for rather than the chain currently shown', () => {
    const { result, rerender } = renderHook(({ chainId }) => useCustomAddress(chainId), {
      initialProps: { chainId: ethChainId },
    })
    act(() => result.current[1](BTC, btcChainId))
    expect(result.current[0]).toBe('')
    rerender({ chainId: btcChainId })
    expect(result.current[0]).toBe(BTC)
  })

  it('scopes an initial address to the mount chain', () => {
    const { result, rerender } = renderHook(({ chainId }) => useCustomAddress(chainId, ETH), {
      initialProps: { chainId: ethChainId },
    })
    expect(result.current[0]).toBe(ETH)
    rerender({ chainId: nearChainId })
    expect(result.current[0]).toBe('')
  })
})
