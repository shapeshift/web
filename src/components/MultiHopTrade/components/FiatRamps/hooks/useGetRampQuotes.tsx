import type { AssetId } from '@shapeshiftoss/caip'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import type { RampQuote } from '@/components/Modals/FiatRamps/config'
import { supportedFiatRamps } from '@/components/Modals/FiatRamps/config'
import {
  findOnramperTokenIdByAssetId,
  getSupportedOnramperCurrencies,
} from '@/components/Modals/FiatRamps/fiatRampProviders/onramper/utils'
import type { FiatRampAction } from '@/components/Modals/FiatRamps/FiatRampsCommon'
import { useDebounce } from '@/hooks/useDebounce/useDebounce'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { FiatCurrencyItem } from '@/lib/fiatCurrencies/fiatCurrencies'
import { useGetFiatRampsQuery } from '@/state/apis/fiatRamps/fiatRamps'

type UseGetRampQuotesProps = {
  fiatCurrency: FiatCurrencyItem
  assetId: AssetId
  amount: string
  direction: FiatRampAction
}

export const useGetRampQuotes = ({
  fiatCurrency,
  assetId,
  amount,
  direction,
}: UseGetRampQuotesProps) => {
  const { data: ramps } = useGetFiatRampsQuery()

  const { data: onramperCurrencies } = useQuery({
    queryKey: ['onramperCurrencies'],
    queryFn: getSupportedOnramperCurrencies,
    gcTime: Infinity,
    staleTime: Infinity,
  })

  const debouncedAmount = useDebounce(amount, 1000)

  const queryKey = useMemo(() => {
    return ['rampQuote', debouncedAmount, direction, onramperCurrencies, assetId, fiatCurrency]
  }, [debouncedAmount, direction, onramperCurrencies, assetId, fiatCurrency])

  const supportedRamps = useMemo(() => {
    if (!ramps?.byAssetId[assetId]?.[direction]) return []

    return ramps?.byAssetId[assetId]?.[direction].map(fiatRampId => supportedFiatRamps[fiatRampId])
  }, [ramps, assetId, direction])

  console.log('supportedRamps', supportedRamps)

  const rampQuoteQueries = useQueries({
    queries:
      supportedRamps?.map(fiatRamp => ({
        queryKey: [...queryKey, fiatRamp.id],
        queryFn: () => {
          switch (fiatRamp.id) {
            case 'OnRamper': {
              if (!onramperCurrencies) throw new Error('Onramper currencies not found')
              const crypto = findOnramperTokenIdByAssetId(assetId, onramperCurrencies)
              if (!crypto) throw new Error('Asset not found')

              return fiatRamp.getQuotes?.({
                fiatCurrency,
                crypto,
                amount,
                direction,
              })
            }
            default: {
              if (!fiatRamp.getQuotes) throw new Error('Fiat ramp get quotes not found')

              return fiatRamp.getQuotes?.({
                fiatCurrency,
                crypto: assetId,
                amount,
                direction,
              })
            }
          }
        },
        staleTime: 0,
        enabled: bnOrZero(debouncedAmount).gt(0),
        gcTime: 0,
      })) ?? [],
  })

  // Sort quotes by best rate (highest amount out)
  const sortedQuotes = useMemo(() => {
    const successfulQuotes = rampQuoteQueries
      .filter(query => query.isSuccess && query.data)
      .map(query => query.data as RampQuote)
      .sort((a, b) => {
        const amountA = bnOrZero(a.amount)
        const amountB = bnOrZero(b.amount)
        return amountB.comparedTo(amountA)
      })

    return successfulQuotes.map((quote, index) => ({
      ...quote,
      isBestRate: index === 0,
    }))
  }, [rampQuoteQueries])

  return {
    queries: rampQuoteQueries,
    sortedQuotes,
  }
}
