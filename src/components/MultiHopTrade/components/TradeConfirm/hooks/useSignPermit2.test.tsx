import { ChainAdapterError } from '@shapeshiftoss/chain-adapters'
import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSignPermit2 } from './useSignPermit2'

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  showErrorToast: vi.fn(),
  signTypedData: vi.fn(),
  quote: { id: 'quote', quoteOrRate: 'quote', deadline: 1791934983000 },
  typedData: { message: { deadline: '1791934983' } },
}))

vi.mock('@shapeshiftoss/swapper', () => ({
  getPermit2Eip712: () => mocks.typedData,
  isExecutableTradeQuote: () => true,
}))
vi.mock('@/hooks/useErrorToast/useErrorToast', () => ({
  useErrorToast: () => ({ showErrorToast: mocks.showErrorToast }),
}))
vi.mock('@/hooks/useWallet/useWallet', () => ({
  useWallet: () => ({ state: { wallet: {} } }),
}))
vi.mock('@/lib/utils/evm', () => ({
  assertGetEvmChainAdapter: () => ({
    getBip44Params: () => ({ purpose: 44, coinType: 60, accountNumber: 0 }),
    signTypedData: mocks.signTypedData,
  }),
}))
vi.mock('@/state/slices/selectors', () => ({
  selectPortfolioAccountMetadataByAccountId: () => ({ bip44Params: { accountNumber: 0 } }),
}))
vi.mock('@/state/slices/tradeQuoteSlice/selectors', () => ({
  selectHopSellAccountId: () => 'eip155:1:0x1111111111111111111111111111111111111111',
  selectConfirmedQuote: () => mocks.quote,
}))
vi.mock('@/state/slices/tradeQuoteSlice/tradeQuoteSlice', () => ({
  tradeQuoteSlice: {
    actions: {
      setPermit2SignaturePending: (payload: unknown) => ({ type: 'pending', payload }),
      setPermit2SignatureFailed: (payload: unknown) => ({ type: 'failed', payload }),
      setPermit2SignatureComplete: (payload: unknown) => ({ type: 'complete', payload }),
    },
  },
}))
vi.mock('@/state/store', () => ({
  useAppDispatch: () => mocks.dispatch,
  useAppSelector: (selector: (state: unknown) => unknown) => selector({}),
}))

const step = { sellAsset: { chainId: 'eip155:1' } } as TradeQuoteStep

describe('useSignPermit2', () => {
  beforeEach(() => {
    mocks.quote = { id: 'quote', quoteOrRate: 'quote', deadline: 1791934983000 }
    mocks.typedData = { message: { deadline: '1791934983' } }
    vi.useFakeTimers()
    vi.setSystemTime(mocks.quote.deadline - 300000)
    mocks.signTypedData.mockResolvedValue('0xsignature')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('rejects a quote after five minutes without requesting a signature', async () => {
    const { result } = renderHook(() => useSignPermit2(step, 0, 'quote'))
    vi.advanceTimersByTime(300001)

    await act(() => result.current.signPermit2())

    expect(mocks.signTypedData).not.toHaveBeenCalled()
    expect(mocks.showErrorToast).toHaveBeenCalledWith(expect.any(ChainAdapterError))
    expect(mocks.showErrorToast.mock.calls[0][0].metadata.translation).toBe(
      'trade.errors.quoteExpired',
    )
    expect(mocks.dispatch).toHaveBeenLastCalledWith({
      type: 'failed',
      payload: { hopIndex: 0, id: 'quote' },
    })
  })

  it('signs the provider payload while the quote is valid', async () => {
    const { result } = renderHook(() => useSignPermit2(step, 0, 'quote'))

    await act(() => result.current.signPermit2())

    expect(mocks.signTypedData).toHaveBeenCalledWith({
      typedDataToSign: { addressNList: expect.any(Array), typedData: mocks.typedData },
      wallet: {},
    })
    expect(mocks.showErrorToast).not.toHaveBeenCalled()
    expect(mocks.dispatch).toHaveBeenLastCalledWith({
      type: 'complete',
      payload: { hopIndex: 0, id: 'quote', permit2Signature: '0xsignature' },
    })
  })

  it('requests a new signature after the expired quote is replaced', async () => {
    const { result, rerender } = renderHook(() => useSignPermit2(step, 0, mocks.quote.id))
    vi.advanceTimersByTime(300001)
    await act(() => result.current.signPermit2())
    expect(mocks.signTypedData).not.toHaveBeenCalled()

    mocks.quote = { id: 'fresh-quote', quoteOrRate: 'quote', deadline: Date.now() + 300000 }
    mocks.typedData = { message: { deadline: String(Math.floor(mocks.quote.deadline / 1000)) } }
    rerender()
    await act(() => result.current.signPermit2())

    expect(mocks.signTypedData).toHaveBeenCalledWith({
      typedDataToSign: { addressNList: expect.any(Array), typedData: mocks.typedData },
      wallet: {},
    })
    expect(mocks.dispatch).toHaveBeenLastCalledWith({
      type: 'complete',
      payload: { hopIndex: 0, id: 'fresh-quote', permit2Signature: '0xsignature' },
    })
  })
})
