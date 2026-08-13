import { describe, expect, it } from 'vitest'

import { getInputCta } from '../inputCta'

const base = {
  isDepositCapable: false,
  hasWalletForSellChain: true,
  isUnsupportedChain: false,
  allowShapeshiftRedirect: true,
  hasReceiveAddress: true,
  hasSendAddress: true,
  hasAmount: true,
  isLoadingRates: false,
  hasRates: true,
  hasRatesError: false,
}

describe('getInputCta', () => {
  it('offers a wallet-free deposit when the selected rate supports it', () => {
    const cta = getInputCta({ ...base, isDepositCapable: true, hasWalletForSellChain: false })
    expect(cta).toEqual({ text: 'Continue without a wallet', disabled: false, action: 'deposit' })
  })

  it('asks for a refund address before it can quote a deposit', () => {
    const cta = getInputCta({
      ...base,
      isDepositCapable: true,
      hasWalletForSellChain: false,
      hasSendAddress: false,
    })
    expect(cta).toEqual({ text: 'Enter refund address', disabled: true, action: 'none' })
  })

  it('asks for a receive address before it can quote a deposit', () => {
    const cta = getInputCta({
      ...base,
      isDepositCapable: true,
      hasWalletForSellChain: false,
      hasReceiveAddress: false,
    })
    expect(cta).toEqual({ text: 'Enter receive address', disabled: true, action: 'none' })
  })

  it('falls back to connect when the selected rate is wallet-only', () => {
    const cta = getInputCta({ ...base, hasWalletForSellChain: false })
    expect(cta).toEqual({ text: 'Connect Wallet', disabled: false, action: 'connect' })
  })

  it('swaps normally with a connected wallet', () => {
    expect(getInputCta({ ...base, isDepositCapable: true })).toEqual({
      text: 'Swap',
      disabled: false,
      action: 'quote',
    })
  })

  it('offers a deposit on a chain the widget cannot sign for', () => {
    const cta = getInputCta({
      ...base,
      isUnsupportedChain: true,
      isDepositCapable: true,
      hasWalletForSellChain: false,
    })
    expect(cta.action).toBe('deposit')
  })

  it('redirects on an unsupported chain with no deposit route', () => {
    const cta = getInputCta({ ...base, isUnsupportedChain: true, hasWalletForSellChain: false })
    expect(cta).toEqual({ text: 'Proceed on ShapeShift', disabled: false, action: 'redirect' })
  })

  it('blocks an unsupported chain when the redirect is disabled', () => {
    const cta = getInputCta({
      ...base,
      isUnsupportedChain: true,
      hasWalletForSellChain: false,
      allowShapeshiftRedirect: false,
    })
    expect(cta).toEqual({ text: 'Route not supported', disabled: true, action: 'none' })
  })

  it('reports rate loading and failure states', () => {
    expect(getInputCta({ ...base, isLoadingRates: true }).text).toBe('Finding rates...')
    expect(getInputCta({ ...base, hasRatesError: true }).text).toBe('No routes available')
    expect(getInputCta({ ...base, hasRates: false }).text).toBe('No routes found')
    expect(getInputCta({ ...base, hasAmount: false }).text).toBe('Enter an amount')
  })
})
