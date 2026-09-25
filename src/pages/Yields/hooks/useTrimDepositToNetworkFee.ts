import { useEffect } from 'react'

import { bnOrZero } from '@/lib/bignumber/bignumber'

type UseTrimDepositToNetworkFeeArgs = {
  isEnabled: boolean
  maxAmountCryptoPrecision: string | undefined
  cryptoAmount: string
  setCryptoAmount: (amount: string) => void
}

// A full-balance deposit chosen before the fee was priced is trimmed to what the fee leaves once it is
export const useTrimDepositToNetworkFee = ({
  isEnabled,
  maxAmountCryptoPrecision,
  cryptoAmount,
  setCryptoAmount,
}: UseTrimDepositToNetworkFeeArgs) => {
  useEffect(() => {
    if (!isEnabled || !maxAmountCryptoPrecision) return

    const max = bnOrZero(maxAmountCryptoPrecision)
    if (max.gt(0) && max.lt(bnOrZero(cryptoAmount))) setCryptoAmount(max.toFixed())
  }, [isEnabled, maxAmountCryptoPrecision, cryptoAmount, setCryptoAmount])
}
