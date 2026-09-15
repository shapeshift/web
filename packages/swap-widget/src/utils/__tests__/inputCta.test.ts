import { describe, expect, it } from 'vitest'

import { getInputCta } from '../inputCta'

const base = {
  isDepositRoute: false,
  hasWalletForSellChain: true,
  isSellChainTypeConnected: true,
  isUnsupportedChain: false,
  supportsDepositRoute: false,
  allowShapeshiftRedirect: true,
  hasReceiveAddress: true,
  hasSendAddress: true,
  hasAmount: true,
  isLoadingRates: false,
  hasRates: true,
  hasRatesError: false,
}

const noWallet = { hasWalletForSellChain: false, isSellChainTypeConnected: false }

describe('getInputCta', () => {
  it('offers a deposit when the selected rate supports it', () => {
    const cta = getInputCta({ ...base, ...noWallet, isDepositRoute: true })
    expect(cta).toEqual({ text: 'Continue without a wallet', disabled: false, action: 'deposit' })
  })

  it('asks for a refund address before it can quote a deposit', () => {
    const cta = getInputCta({ ...base, ...noWallet, isDepositRoute: true, hasSendAddress: false })
    expect(cta).toEqual({ text: 'Enter refund address', disabled: true, action: 'none' })
  })

  it('asks for a receive address before it can quote a deposit', () => {
    const cta = getInputCta({
      ...base,
      ...noWallet,
      isDepositRoute: true,
      hasReceiveAddress: false,
    })
    expect(cta).toEqual({ text: 'Enter receive address', disabled: true, action: 'none' })
  })

  it('falls back to connect when the selected rate is wallet-only', () => {
    const cta = getInputCta({ ...base, ...noWallet })
    expect(cta).toEqual({ text: 'Connect Wallet', disabled: false, action: 'connect' })
  })

  it('redirects when the connected wallet cannot serve the sell chain', () => {
    const cta = getInputCta({ ...base, hasWalletForSellChain: false })
    expect(cta).toEqual({ text: 'Proceed on ShapeShift', disabled: false, action: 'redirect' })
  })

  it('blocks a sell chain the connected wallet cannot serve when the redirect is disabled', () => {
    const cta = getInputCta({
      ...base,
      hasWalletForSellChain: false,
      allowShapeshiftRedirect: false,
    })
    expect(cta).toEqual({ text: 'Route not supported', disabled: true, action: 'none' })
  })

  it('swaps normally with a connected wallet', () => {
    expect(getInputCta(base)).toEqual({ text: 'Swap', disabled: false, action: 'quote' })
  })

  it('offers a deposit on a chain the widget cannot sign for', () => {
    const cta = getInputCta({
      ...base,
      ...noWallet,
      isUnsupportedChain: true,
      supportsDepositRoute: true,
      isDepositRoute: true,
    })
    expect(cta.action).toBe('deposit')
  })

  it('asks for an amount on an unsupported chain where a deposit route can exist', () => {
    const cta = getInputCta({
      ...base,
      ...noWallet,
      isUnsupportedChain: true,
      supportsDepositRoute: true,
      hasAmount: false,
      hasRates: false,
    })
    expect(cta).toEqual({ text: 'Enter an amount', disabled: true, action: 'none' })
  })

  it('waits for rates on an unsupported chain where a deposit route can exist', () => {
    const cta = getInputCta({
      ...base,
      ...noWallet,
      isUnsupportedChain: true,
      supportsDepositRoute: true,
      isLoadingRates: true,
      hasRates: false,
    })
    expect(cta).toEqual({ text: 'Finding rates...', disabled: true, action: 'none' })
  })

  it('redirects straight away on an unsupported chain with no deposit route, before any amount', () => {
    const cta = getInputCta({
      ...base,
      ...noWallet,
      isUnsupportedChain: true,
      hasAmount: false,
      hasRates: false,
    })
    expect(cta).toEqual({ text: 'Proceed on ShapeShift', disabled: false, action: 'redirect' })
  })

  it('redirects an unsupported chain once rates show no deposit route, even if they failed', () => {
    const redirect = { text: 'Proceed on ShapeShift', disabled: false, action: 'redirect' }
    const unsupported = {
      ...base,
      ...noWallet,
      isUnsupportedChain: true,
      supportsDepositRoute: true,
    }

    expect(getInputCta(unsupported)).toEqual(redirect)
    expect(getInputCta({ ...unsupported, hasRates: false })).toEqual(redirect)
    expect(getInputCta({ ...unsupported, hasRates: false, hasRatesError: true })).toEqual(redirect)
  })

  it('blocks an unsupported chain when the redirect is disabled', () => {
    const cta = getInputCta({
      ...base,
      ...noWallet,
      isUnsupportedChain: true,
      hasRates: false,
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
