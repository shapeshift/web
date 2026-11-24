import { btcAssetId, ethAssetId, usdcAssetId } from '@shapeshiftoss/caip'
import { act, cleanup, renderHook } from '@testing-library/react'
import type { UseFormReturn } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { applyQrScanAsset } from './applyQrScanAsset'
import type { SendInput } from './Form'
import { SendFormFields } from './SendCommon'

const mocks = vi.hoisted(() => ({ accounts: [] as string[] }))
const ethereumAccount = 'eip155:1:0x1111111111111111111111111111111111111111'
const bitcoinAccount = 'bip122:000000000019d6689c085ae165831e93:fixture'

vi.mock('@/state/store', () => ({ store: { getState: (): object => ({}) } }))
vi.mock('@/state/slices/selectors', () => ({
  selectPortfolioAccountIdsByAssetIdFilter: (): string[] => mocks.accounts,
  selectMarketDataByAssetIdUserCurrency: (): { price: string } => ({ price: '2' }),
}))

const createForm = (values: Partial<SendInput> = {}): UseFormReturn<SendInput> => {
  const { result } = renderHook(() =>
    useForm<SendInput>({
      defaultValues: {
        assetId: ethAssetId,
        accountId: ethereumAccount,
        sendMax: true,
        amountCryptoPrecision: '9',
        fiatAmount: '18',
        ...values,
      },
    }),
  )
  return result.current
}

afterEach(cleanup)
beforeEach(() => {
  mocks.accounts = []
})

describe('applyQrScanAsset', () => {
  it('clears an incompatible account when the scanned chain has no enabled account', () => {
    const methods = createForm()
    act(() =>
      applyQrScanAsset(methods, {
        qrAssetId: btcAssetId,
        amountCryptoPrecision: '1',
        isPaymentUri: true,
      }),
    )
    expect(methods.getValues(SendFormFields.AssetId)).toBe(btcAssetId)
    expect(methods.getValues(SendFormFields.AccountId)).toBe('')
  })

  it('keeps the chosen account when the scanned asset does not change', () => {
    const methods = createForm()
    mocks.accounts = ['eip155:1:0x2222222222222222222222222222222222222222']
    act(() =>
      applyQrScanAsset(methods, {
        qrAssetId: ethAssetId,
        amountCryptoPrecision: '1',
        isPaymentUri: true,
      }),
    )
    expect(methods.getValues(SendFormFields.AccountId)).toBe(ethereumAccount)
  })

  it('selects the enabled account when the asset changes', () => {
    const methods = createForm()
    mocks.accounts = [bitcoinAccount]
    act(() =>
      applyQrScanAsset(methods, {
        qrAssetId: btcAssetId,
        amountCryptoPrecision: '1',
        isPaymentUri: true,
      }),
    )
    expect(methods.getValues(SendFormFields.AccountId)).toBe(bitcoinAccount)
  })

  it('selects an available account when the asset is unchanged but no account was selected', () => {
    const methods = createForm({ accountId: '' })
    mocks.accounts = [ethereumAccount]
    act(() =>
      applyQrScanAsset(methods, {
        qrAssetId: ethAssetId,
        amountCryptoPrecision: '1',
        isPaymentUri: true,
      }),
    )
    expect(methods.getValues(SendFormFields.AccountId)).toBe(ethereumAccount)
  })

  it('turns off Max before applying a payment amount and its fiat value', () => {
    const methods = createForm()
    const setValue = vi.spyOn(methods, 'setValue')
    act(() =>
      applyQrScanAsset(methods, {
        qrAssetId: ethAssetId,
        amountCryptoPrecision: '1',
        isPaymentUri: true,
      }),
    )
    expect(methods.getValues(SendFormFields.SendMax)).toBe(false)
    expect(methods.getValues(SendFormFields.AmountCryptoPrecision)).toBe('1')
    expect(methods.getValues(SendFormFields.FiatAmount)).toBe('2')
    const fields = setValue.mock.calls.map(([field]) => field)
    expect(fields.indexOf(SendFormFields.SendMax)).toBeLessThan(
      fields.indexOf(SendFormFields.AmountCryptoPrecision),
    )
    expect(fields.indexOf(SendFormFields.SendMax)).toBeLessThan(
      fields.indexOf(SendFormFields.FiatAmount),
    )
  })

  it.each([undefined, '0'])(
    'turns off Max when clearing an absent or zero scanned amount (%s)',
    amountCryptoPrecision => {
      const methods = createForm({ assetId: usdcAssetId })
      act(() =>
        applyQrScanAsset(methods, {
          qrAssetId: ethAssetId,
          amountCryptoPrecision,
          isPaymentUri: false,
        }),
      )
      expect(methods.getValues(SendFormFields.SendMax)).toBe(false)
      expect(methods.getValues(SendFormFields.AmountCryptoPrecision)).toBe('')
      expect(methods.getValues(SendFormFields.FiatAmount)).toBe('')
      expect(methods.getValues(SendFormFields.AssetId)).toBe(usdcAssetId)
    },
  )

  it('leaves form state alone when the QR still needs asset selection', () => {
    const methods = createForm({ assetId: usdcAssetId })
    const before = methods.getValues()
    const result = applyQrScanAsset(methods, {
      qrAssetId: 'eip155:8453/slip44:60',
      amountCryptoPrecision: undefined,
      isPaymentUri: true,
    })
    expect(result.isAmbiguous).toBe(true)
    expect(methods.getValues()).toEqual(before)
  })
})
