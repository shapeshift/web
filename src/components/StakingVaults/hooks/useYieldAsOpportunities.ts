import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import { DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID } from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { useAllYieldBalances } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYields } from '@/react-queries/queries/yieldxyz/useYields'
import type { AggregatedOpportunitiesByAssetIdReturn } from '@/state/slices/opportunitiesSlice/types'

export type YieldOpportunityDisplay = {
  yieldId: string
  providerName: string
  providerIcon?: string
  apy: string
  fiatAmount: string
  cryptoAmount: string
}

export type YieldAggregatedOpportunity = AggregatedOpportunitiesByAssetIdReturn & {
  yieldOpportunities: YieldOpportunityDisplay[]
  searchable: string[]
  isYield: true
}

export const useYieldAsOpportunities = (
  enabled: boolean,
): {
  data: YieldAggregatedOpportunity[] | undefined
  isLoading: boolean
} => {
  const { data: yieldsData, isLoading: isYieldsLoading } = useYields({ enabled })
  const { data: yieldBalancesData, isLoading: isYieldBalancesLoading } = useAllYieldBalances({
    enabled,
  })

  const data = useMemo<YieldAggregatedOpportunity[] | undefined>(() => {
    if (!yieldsData?.all) return undefined

    const aggregatedByAssetId: Record<AssetId, YieldAggregatedOpportunity> = {}

    yieldsData.all.forEach((yieldItem: AugmentedYieldDto) => {
      const inputAssetId = yieldItem.inputTokens?.[0]?.assetId
      if (!inputAssetId) return

      if (!aggregatedByAssetId[inputAssetId]) {
        aggregatedByAssetId[inputAssetId] = {
          assetId: inputAssetId,
          underlyingAssetIds: [inputAssetId],
          apy: undefined,
          fiatAmount: '0',
          cryptoBalancePrecision: '0',
          fiatRewardsAmount: '0',
          opportunities: {
            staking: [],
            lp: [],
          },
          yieldOpportunities: [],
          searchable: [],
          isYield: true,
        }
      }

      const balancesForYield = yieldBalancesData?.aggregated[yieldItem.id]
      const { chainId } = fromAssetId(inputAssetId)

      let totalUsd: string
      let totalCrypto: string

      if (balancesForYield?.hasValidators) {
        const defaultValidatorAddress = DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[chainId]
        const validatorAddresses = Object.keys(balancesForYield.byValidator)
        const selectedValidatorAddress = defaultValidatorAddress ?? validatorAddresses[0]
        const validatorBalance = selectedValidatorAddress
          ? balancesForYield.byValidator[selectedValidatorAddress]
          : undefined
        totalUsd = validatorBalance?.totalUsd ?? '0'
        totalCrypto = validatorBalance?.totalCrypto ?? '0'
      } else {
        totalUsd = balancesForYield?.totalUsd ?? '0'
        totalCrypto = balancesForYield?.totalCrypto ?? '0'
      }

      const existingFiatAmount = bnOrZero(aggregatedByAssetId[inputAssetId].fiatAmount)
      const existingCryptoBalancePrecision = bnOrZero(
        aggregatedByAssetId[inputAssetId].cryptoBalancePrecision,
      )

      aggregatedByAssetId[inputAssetId].fiatAmount = existingFiatAmount.plus(totalUsd).toFixed(2)
      aggregatedByAssetId[inputAssetId].cryptoBalancePrecision = existingCryptoBalancePrecision
        .plus(totalCrypto)
        .toString()

      const currentApy = aggregatedByAssetId[inputAssetId].apy
      aggregatedByAssetId[inputAssetId].apy = currentApy
        ? bnOrZero(currentApy).gt(yieldItem.rewardRate.total)
          ? currentApy
          : yieldItem.rewardRate.total.toString()
        : yieldItem.rewardRate.total.toString()

      aggregatedByAssetId[inputAssetId].yieldOpportunities.push({
        yieldId: yieldItem.id,
        providerName: yieldItem.metadata.name || yieldItem.providerId,
        providerIcon: yieldItem.metadata.logoURI,
        apy: yieldItem.rewardRate.total.toString(),
        fiatAmount: bnOrZero(totalUsd).toFixed(2),
        cryptoAmount: bnOrZero(totalCrypto).toString(),
      })

      const searchable = aggregatedByAssetId[inputAssetId].searchable
      const tokenSymbol = yieldItem.inputTokens?.[0]?.symbol ?? yieldItem.token.symbol
      const tokenName = yieldItem.inputTokens?.[0]?.name ?? yieldItem.token.name
      const providerName = yieldItem.metadata.name || yieldItem.providerId
      searchable.push(tokenSymbol, tokenName, providerName, yieldItem.id)
    })

    const result = Object.values(aggregatedByAssetId)

    result.forEach(agg => {
      agg.yieldOpportunities.sort((a, b) => {
        const aFiat = bnOrZero(a.fiatAmount)
        const bFiat = bnOrZero(b.fiatAmount)
        if (!aFiat.eq(bFiat)) return bFiat.minus(aFiat).toNumber()
        return bnOrZero(b.apy).minus(bnOrZero(a.apy)).toNumber()
      })
    })

    console.debug(
      '[useYieldAsOpportunities] Result:',
      JSON.stringify(
        result.map(r => ({
          assetId: r.assetId,
          fiatAmount: r.fiatAmount,
          yieldOpportunities: r.yieldOpportunities.map(y => ({
            providerName: y.providerName,
            fiatAmount: y.fiatAmount,
          })),
        })),
        null,
        2,
      ),
    )

    return result
  }, [yieldBalancesData?.aggregated, yieldsData?.all])

  const isLoading = isYieldsLoading || isYieldBalancesLoading

  return { data, isLoading }
}
