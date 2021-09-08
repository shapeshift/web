import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { getAssetData } from '@shapeshiftoss/market-service'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { FeePrice } from '../../views/Confirm'

export const useSendFees = () => {
  const [fees, setFees] = useState<FeePrice | null>(null)
  const { control } = useFormContext()
  const { asset, estimatedFees } = useWatch({
    control
  })
  const {
    state: { wallet }
  } = useWallet()

  useEffect(() => {
    ;(async () => {
      if (wallet) {
        /**
         * TODO (technojak) Hardcoded to eth precision. When using the asset-service check if ERC20
         * and default to eth precision. Asset service will use tokenId vs contractAddress.
         * Also important to note that asset service has a contract type.
         */
        const precision = 18
        const feeMarketData = await getAssetData(asset?.network)
        const txFees = (Object.keys(estimatedFees) as FeeDataKey[]).reduce(
          (acc: FeePrice, key: FeeDataKey) => {
            const current = estimatedFees[key]
            const fee = bnOrZero(current.networkFee).div(`1e${precision}`).toPrecision()
            const amount = bnOrZero(fee).times(bnOrZero(feeMarketData?.price)).toPrecision()
            acc[key] = { ...current, fee, amount }
            return acc
          },
          {} as FeePrice
        )
        setFees(txFees)
      }
    })()
    // We only want this effect to run on mount or when the estimatedFees in state change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimatedFees])

  return { fees }
}
