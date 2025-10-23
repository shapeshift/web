export type BanxaPaymentMethod = {
  id: string
  type: string
  name: string
  description: string
  logo_url: string
  status: string
  fees: {
    type: string
    value: string
  }
  limits: {
    min: string
    max: string
  }
}

export type BanxaQuoteResponse = {
  data: {
    id: string
    type: string
    attributes: {
      payment_methods: BanxaPaymentMethod[]
      fiat: {
        code: string
        amount: string
      }
      crypto: {
        code: string
        amount: string
        network: string
      }
      fee: {
        type: string
        value: string
      }
      total: {
        type: string
        value: string
      }
      rate: string
      payment_method_id: string
      payment_method: {
        id: string
        type: string
        name: string
        description: string
        logo_url: string
        status: string
        fees: {
          type: string
          value: string
        }
        limits: {
          min: string
          max: string
        }
      }
    }
  }
}

export type BanxaQuoteRequest = {
  partner: string
  paymentMethodId?: string
  crypto: string
  blockchain: string
  fiat: string
  cryptoAmount?: string
  fiatAmount?: string
  externalCustomerId?: string
  ipAddress?: string
  discountCode?: string
}
