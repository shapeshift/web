// https://github.com/onramper/widget/blob/master/package/src/ApiContext/api/types/gateways.ts
export type Crypto = {
  id: string
  code: string
  name: string
  symbol: string
  network: string
  decimals?: number
  address?: string
  chainId?: number
  icon: string
  networkDisplayName?: string
}

type Fiat = {
  id: string
  code: string
  name: string
  symbol: string
  icon: string
}

export type OnRamperGatewaysResponse = {
  message: {
    crypto: Crypto[]
    fiat: Fiat[]
  }
}

// Types for buy quotes based on https://docs.onramper.com/reference/get_quotes-fiat-crypto
type PaymentLimits = {
  min: number
  max: number
}

type PaymentMethodDetails = {
  currencyStatus: string
  limits: Record<string, PaymentLimits> & {
    aggregatedLimit: PaymentLimits
  }
}

type PaymentMethod = {
  paymentTypeId: string
  name: string
  icon: string
  details: PaymentMethodDetails
}

type QuoteError = {
  type: string
  errorId: number
  message: string
  name?: string
  timeout?: number
}

type KycRequirements = {
  onramperLoginRequired: boolean
  onramperKycRequirement: string
  partnerLoginRequired: boolean
  partnerKycRequirement: string
}

export type OnramperBuyQuote = {
  rate?: number
  networkFee?: number
  transactionFee?: number
  payout?: number
  availablePaymentMethods?: PaymentMethod[]
  ramp: string
  paymentMethod: string
  quoteId: string
  recommendations?: string[]
  errors?: QuoteError[]
  kycRequirements?: KycRequirements
}

export type OnramperBuyQuoteResponse = OnramperBuyQuote[]
