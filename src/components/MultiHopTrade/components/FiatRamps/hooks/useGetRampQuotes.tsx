import type { AssetId } from '@shapeshiftoss/caip'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import type { FiatCurrencyItem } from '@/components/Modals/FiatRamps/config'
import { supportedFiatRamps } from '@/components/Modals/FiatRamps/config'
import {
  findOnramperTokenIdByAssetId,
  getSupportedOnramperCurrencies,
} from '@/components/Modals/FiatRamps/fiatRampProviders/onramper/utils'
import { useDebounce } from '@/hooks/useDebounce/useDebounce'
import { useGetFiatRampsQuery } from '@/state/apis/fiatRamps/fiatRamps'
import { tradeRampInput } from '@/state/slices/tradeRampInputSlice/tradeRampInputSlice'
import { useAppDispatch } from '@/state/store'

type UseGetRampQuotesProps = {
  fiat: FiatCurrencyItem
  assetId: AssetId
  amount: string
  direction: 'buy' | 'sell'
}

export const useGetRampQuotes = ({ fiat, assetId, amount, direction }: UseGetRampQuotesProps) => {
  const { data: ramps } = useGetFiatRampsQuery()
  const dispatch = useAppDispatch()

  const { data: onramperCurrencies } = useQuery({
    queryKey: ['onramperCurrencies'],
    queryFn: getSupportedOnramperCurrencies,
    gcTime: Infinity,
    staleTime: Infinity,
  })

  const debouncedAmount = useDebounce(amount, 1000)

  const queryKey = useMemo(() => {
    dispatch(tradeRampInput.actions.setSelectedFiatRampQuote(null))

    return ['rampQuote', fiat, assetId, debouncedAmount, direction, onramperCurrencies]
  }, [fiat, assetId, debouncedAmount, direction, onramperCurrencies, dispatch])

  const supportedRamps = useMemo(() => {
    if (!ramps?.byAssetId[assetId]?.[direction]) return []

    return ramps?.byAssetId[assetId]?.[direction].map(fiatRampId => supportedFiatRamps[fiatRampId])
  }, [ramps, assetId, direction])

  const rampQuoteQueries = useQueries({
    queries:
      supportedRamps?.map(fiatRamp => ({
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
      })) ?? [],
  })

  return rampQuoteQueries
}
