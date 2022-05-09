import { AssetId } from '@shapeshiftoss/caip'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { useEffect, useMemo } from 'react'
import { BigNumber, bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectAssetById,
  selectFirstAccountSpecifierByChainId,
  selectMarketDataById,
} from 'state/slices/selectors'
import {
  ActiveStakingOpportunity,
  selectActiveStakingOpportunityDataByAssetId,
  selectNonloadedValidators,
  selectStakingDataIsLoaded,
  selectValidatorByAddress,
  selectValidatorIsLoaded,
} from 'state/slices/stakingDataSlice/selectors'
import { stakingDataApi } from 'state/slices/stakingDataSlice/stakingDataSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

const SHAPESHIFT_VALIDATOR_ADDRESS = 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf'

type UseCosmosStakingBalancesProps = {
  assetId: AssetId
}

export type UseCosmosStakingBalancesReturn = {
  activeStakingOpportunities: MergedActiveStakingOpportunity[]
  stakingOpportunities: MergedStakingOpportunity[]
  totalBalance: string
  isLoaded: boolean
}

export type MergedActiveStakingOpportunity = ActiveStakingOpportunity & {
  fiatAmount?: string
  tokenAddress: string
  assetId: AssetId
  chain: ChainTypes
  tvl: string
}

export type MergedStakingOpportunity = chainAdapters.cosmos.Validator & {
  tokenAddress: string
  assetId: AssetId
  chain: ChainTypes
  tvl: string
}

export function useCosmosStakingBalances({
  assetId,
}: UseCosmosStakingBalancesProps): UseCosmosStakingBalancesReturn {
  const isStakingDataLoaded = useAppSelector(selectStakingDataIsLoaded)
  const isValidatorDataLoaded = useAppSelector(selectValidatorIsLoaded)
  const isLoaded = isStakingDataLoaded && isValidatorDataLoaded
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const dispatch = useAppDispatch()

  const accountSpecifier = useAppSelector(state =>
    selectFirstAccountSpecifierByChainId(state, asset?.chainId),
  )

  const activeStakingOpportunities = useAppSelector(state =>
    selectActiveStakingOpportunityDataByAssetId(state, {
      accountSpecifier,
      assetId: asset.assetId,
    }),
  )

  const shapeshiftValidator = useAppSelector(state =>
    selectValidatorByAddress(state, {
      validatorAddress: SHAPESHIFT_VALIDATOR_ADDRESS,
    }),
  )
  const stakingOpportunities = useMemo(() => {
    return [
      {
        ...shapeshiftValidator,
      },
    ]
  }, [shapeshiftValidator])

  const nonLoadedValidators = useAppSelector(state =>
    selectNonloadedValidators(state, { accountSpecifier }),
  )

  const chainId = asset.chainId

  const mergedActiveStakingOpportunities = useMemo(() => {
    return Object.values(activeStakingOpportunities).map(opportunity => {
      const fiatAmount = bnOrZero(opportunity.cryptoAmount)
        .div(`1e+${asset.precision}`)
        .times(bnOrZero(marketData.price))
        .toFixed(2)

      const tvl = bnOrZero(opportunity.tokens)
        .div(`1e+${asset.precision}`)
        .times(bnOrZero(marketData?.price))
        .toString()
      const data = {
        ...opportunity,
        cryptoAmount: bnOrZero(opportunity.cryptoAmount)
          .div(`1e+${asset?.precision}`)
          .decimalPlaces(asset.precision)
          .toString(),
        tvl,
        fiatAmount,
        chain: asset.chain,
        assetId,
        tokenAddress: asset.slip44.toString(),
      }
      return data
    })
  }, [assetId, asset, marketData, activeStakingOpportunities])

  const mergedStakingOpportunities = useMemo(() => {
    return Object.values(stakingOpportunities).map(opportunity => {
      const tvl = bnOrZero(opportunity.tokens)
        .div(`1e+${asset.precision}`)
        .times(bnOrZero(marketData?.price))
        .toString()
      const data = {
        ...opportunity,
        tvl,
        chain: asset.chain,
        assetId,
        tokenAddress: asset.slip44.toString(),
      }
      return data
    })
  }, [assetId, asset, marketData, stakingOpportunities])

  const totalBalance = useMemo(
    () =>
      Object.values(mergedActiveStakingOpportunities).reduce(
        (acc: BigNumber, opportunity: MergedActiveStakingOpportunity) => {
          return acc.plus(bnOrZero(opportunity.fiatAmount))
        },
        bnOrZero(0),
      ),
    [mergedActiveStakingOpportunities],
  )

  useEffect(() => {
    ;(async () => {
      if (!accountSpecifier?.length || isStakingDataLoaded) return

      dispatch(
        stakingDataApi.endpoints.getStakingData.initiate(
          { accountSpecifier },
          { forceRefetch: true },
        ),
      )
    })()
  }, [accountSpecifier, isStakingDataLoaded, dispatch])

  useEffect(() => {
    ;(async () => {
      if (isValidatorDataLoaded) return

      dispatch(
        stakingDataApi.endpoints.getAllValidatorsData.initiate({ chainId }, { forceRefetch: true }),
      )
    })()
  }, [isValidatorDataLoaded, dispatch, chainId])

  useEffect(() => {
    ;(async () => {
      if (!isValidatorDataLoaded || !nonLoadedValidators?.length) return

      nonLoadedValidators.forEach(validatorAddress => {
        dispatch(
          stakingDataApi.endpoints.getValidatorData.initiate(
            { chainId, validatorAddress },
            { forceRefetch: true },
          ),
        )
      })
    })()
  }, [isValidatorDataLoaded, nonLoadedValidators, dispatch, chainId])

  return {
    activeStakingOpportunities: isLoaded ? mergedActiveStakingOpportunities : [],
    stakingOpportunities: isLoaded ? mergedStakingOpportunities : [],
    isLoaded,
    totalBalance: totalBalance.toString(),
  }
}
