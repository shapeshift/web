import { CHAIN_NAMESPACE, fromAccountId, thorchainAssetId } from '@shapeshiftoss/caip'
import { isSome } from '@shapeshiftoss/utils'
import { useCallback, useEffect, useMemo } from 'react'

import { RFOX_STAKING_CONFIG } from '../constants'
import type { Epoch } from '../types'
import { calculateLifetimeRewards } from './lifetimeRewards'
import { useEpochHistoryQuery } from './useEpochHistoryQuery'

import { marketApi } from '@/state/slices/marketDataSlice/marketDataSlice'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectAssets,
  selectMarketDataUserCurrency,
} from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

const rewardAssetIds = Array.from(
  new Set([
    thorchainAssetId,
    ...Object.values(RFOX_STAKING_CONFIG).map(config => config.rewardAssetId),
  ]),
)

type UseLifetimeRewardsQueryProps = {
  accountNumber: number | undefined
}

export const useLifetimeRewardsUserCurrencyQuery = ({
  accountNumber,
}: UseLifetimeRewardsQueryProps) => {
  const dispatch = useAppDispatch()
  const accounts = useAppSelector(selectAccountIdByAccountNumberAndChainId)
  const assets = useAppSelector(selectAssets)
  const marketData = useAppSelector(selectMarketDataUserCurrency)
  const accountIdsByChainId = accountNumber === undefined ? undefined : accounts[accountNumber]

  useEffect(() => {
    if (accountNumber === undefined) return
    const subscriptions = rewardAssetIds.map(assetId =>
      dispatch(marketApi.endpoints.findByAssetId.initiate(assetId)),
    )
    return () => subscriptions.forEach(subscription => subscription.unsubscribe())
  }, [accountNumber, dispatch])

  const pricing = useMemo(
    () =>
      Object.fromEntries(
        rewardAssetIds.map(assetId => {
          const asset = assets[assetId]
          const price = marketData[assetId]?.price
          return [
            assetId,
            asset && price !== undefined ? { precision: asset.precision, price } : undefined,
          ]
        }),
      ),
    [assets, marketData],
  )

  const select = useCallback(
    (epochs: Epoch[]) => calculateLifetimeRewards(epochs, accountIdsByChainId ?? {}, pricing),
    [accountIdsByChainId, pricing],
  )

  // EVM accounts share an address across chains, so one lookup covers every program
  const evmAccount = Object.values(accountIdsByChainId ?? {})
    .filter(isSome)
    .map(fromAccountId)
    .find(({ chainNamespace }) => chainNamespace === CHAIN_NAMESPACE.Evm)

  return useEpochHistoryQuery({
    stakingAddress: evmAccount?.account,
    select,
  })
}
