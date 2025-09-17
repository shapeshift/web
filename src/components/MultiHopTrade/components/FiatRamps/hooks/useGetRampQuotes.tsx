import type { AssetId } from '@shapeshiftoss/caip'
import { useQueries, useQuery } from '@tanstack/react-query'

import type { CommonFiatCurrencies } from '@/components/Modals/FiatRamps/config'
import { supportedFiatRamps } from '@/components/Modals/FiatRamps/config'
import type { OnRamperGatewaysResponse } from '@/components/Modals/FiatRamps/fiatRampProviders/onramper/types'
import {
  findOnramperTokenIdByAssetId,
  getSupportedOnramperCurrencies,
} from '@/components/Modals/FiatRamps/fiatRampProviders/onramper/utils'
import { useDebounce } from '@/hooks/useDebounce/useDebounce'

type UseGetRampQuotesProps = {
  fiat: CommonFiatCurrencies
  assetId: AssetId
  amount: string
  direction: 'buy' | 'sell'
}

export const useGetRampQuotes = ({ fiat, assetId, amount, direction }: UseGetRampQuotesProps) => {
  const { data: onramperCurrencies } = useQuery({
    queryKey: ['onramperCurrencies'],
    queryFn: getSupportedOnramperCurrencies,
  })

  const queryKey = useDebounce(() => {
    return ['rampQuote', fiat, assetId, amount, direction, onramperCurrencies]
  }, 1000) as unknown as [
    string,
    {
      fiat: CommonFiatCurrencies
      assetId: AssetId
      amount: string
      direction: 'buy' | 'sell'
      onramperCurrencies: OnRamperGatewaysResponse
    },
  ]

  const rampQuoteQueries = useQueries({
    queries: Object.values(supportedFiatRamps).map(fiatRamp => ({
      queryKey: [...queryKey, fiatRamp.id],
      queryFn: () => {
        switch (fiatRamp.id) {
          case 'OnRamper':
            if (!onramperCurrencies) throw new Error('Onramper currencies not found')
            const crypto = findOnramperTokenIdByAssetId(assetId, onramperCurrencies)
            if (!crypto) throw new Error('Asset not found')

            return fiatRamp.getQuotes?.({
              fiat,
              crypto,
              amount,
              direction,
            })
          default:
            if (!fiatRamp.getQuotes) throw new Error('Fiat ramp get quotes not found')

            return fiatRamp.getQuotes?.({
              fiat,
              crypto: assetId,
              amount,
              direction,
            })
        }
      },
    })),
  })

  return rampQuoteQueries
}
