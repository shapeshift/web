import {
  avalancheChainId,
  bchChainId,
  bscChainId,
  btcChainId,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  fromAccountId,
  ltcChainId,
} from '@shapeshiftoss/caip'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { setTimeoutAsync } from 'lib/utils'
import { useGetZapperAppsBalancesOutputQuery, zapper } from 'state/apis/zapper/zapperApi'
import {
  fetchAllOpportunitiesIdsByChainId,
  fetchAllOpportunitiesMetadataByChainId,
  fetchAllOpportunitiesUserDataByAccountId,
} from 'state/slices/opportunitiesSlice/thunks'
import {
  selectPortfolioAccounts,
  selectPortfolioAssetIds,
  selectPortfolioLoadingStatus,
  selectWalletAccountIds,
} from 'state/slices/selectors'
import { useAppDispatch } from 'state/store'

export const useFetchOpportunities = () => {
  const dispatch = useAppDispatch()
  const portfolioLoadingStatus = useSelector(selectPortfolioLoadingStatus)
  const requestedAccountIds = useSelector(selectWalletAccountIds)
  const portfolioAssetIds = useSelector(selectPortfolioAssetIds)
  const portfolioAccounts = useSelector(selectPortfolioAccounts)
  const DynamicLpAssets = useFeatureFlag('DynamicLpAssets')

  const [isLoading, setIsLoading] = useState(true)

  const { isLoading: isZapperAppsBalancesOutputLoading } = useGetZapperAppsBalancesOutputQuery()

  // TODO: this needs to be split up into separate RTK queries so we aren't refetching when moving around the app
  useEffect(() => {
    ;(async () => {
      if (!requestedAccountIds.length) return
      if (portfolioLoadingStatus === 'loading') return

      setIsLoading(true)

      const maybeFetchZapperData = DynamicLpAssets
        ? dispatch(zapper.endpoints.getZapperUniV2PoolAssetIds.initiate())
        : () => setTimeoutAsync(0)

      await maybeFetchZapperData

      await Promise.all(
        requestedAccountIds.map(accountId => {
          const { chainId } = fromAccountId(accountId)
          switch (chainId) {
            case btcChainId:
            case ltcChainId:
            case dogeChainId:
            case bchChainId:
            case cosmosChainId:
            case bscChainId:
            case avalancheChainId:
            case ethChainId:
              return (async () => {
                await fetchAllOpportunitiesIdsByChainId(chainId)
                await fetchAllOpportunitiesMetadataByChainId(chainId)
                await fetchAllOpportunitiesUserDataByAccountId(accountId)
              })()
            default:
              return Promise.resolve()
          }
        }),
      )

      setIsLoading(false)
    })()
  }, [
    portfolioLoadingStatus,
    portfolioAccounts,
    DynamicLpAssets,
    dispatch,
    requestedAccountIds,
    portfolioAssetIds,
  ])

  return useMemo(
    () => ({ isLoading: isLoading || isZapperAppsBalancesOutputLoading }),
    [isLoading, isZapperAppsBalancesOutputLoading],
  )
}
