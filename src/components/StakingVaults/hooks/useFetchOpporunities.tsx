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
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { setTimeoutAsync } from 'lib/utils'
import { nftApi } from 'state/apis/nft/nftApi'
import { zapper } from 'state/apis/zapper/zapperApi'
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

  // TODO: this needs to be split up into separate react-queries so we aren't refetching when moving around the app
  useEffect(() => {
    ;(async () => {
      if (!requestedAccountIds.length) return
      if (portfolioLoadingStatus === 'loading') return

      setIsLoading(true)

      dispatch(nftApi.endpoints.getNftUserTokens.initiate({ accountIds: requestedAccountIds }))

      dispatch(zapper.endpoints.getZapperAppsBalancesOutput.initiate())

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

  return isLoading
}
