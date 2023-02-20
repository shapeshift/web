import { ethAssetId, ethChainId, fromAccountId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { WETH_TOKEN_CONTRACT_ADDRESS } from 'contracts/constants'
import { fetchUniV2PairData, getOrCreateContract } from 'contracts/contractManager'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { getEthersProvider } from 'lib/ethersProviderSingleton'
import { toBaseUnit } from 'lib/math'
import type { ReduxState } from 'state/reducer'
import type { AssetsState } from 'state/slices/assetsSlice/assetsSlice'
import { marketData } from 'state/slices/marketDataSlice/marketDataSlice'
import type { PortfolioAccountBalancesById } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import { selectPortfolioLoadingStatusGranular } from 'state/slices/portfolioSlice/selectors'
import { selectMarketDataById, selectPortfolioAccountBalances } from 'state/slices/selectors'

import type { foxEthLpContractAddress } from '../../constants'
import { foxEthLpAssetIds } from '../../constants'
import type { GetOpportunityIdsOutput, GetOpportunityMetadataOutput } from '../../types'
import type { OpportunityMetadataResolverInput, OpportunityUserDataResolverInput } from '../types'
import { calculateAPRFromToken0 } from './utils'

export const uniV2LpMetadataResolver = async ({
  opportunityId,
  opportunityType,
  reduxApi,
}: OpportunityMetadataResolverInput): Promise<{
  data: GetOpportunityMetadataOutput
}> => {
  const { dispatch, getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const assets: AssetsState = state.assets

  const ethersProvider = getEthersProvider()

  const pair = await fetchUniV2PairData(opportunityId)

  const blockNumber = await ethersProvider.getBlockNumber()

  const calculatedApy = await calculateAPRFromToken0({
    token0Decimals: pair.token0.decimals,
    token0Reserves: pair.reserve0,
    blockNumber,
    pairAssetId: opportunityId,
  })

  const { chainId } = fromAssetId(opportunityId)
  const token0MarketData: MarketData = selectMarketDataById(
    state,
    toAssetId({
      assetNamespace: 'erc20',
      assetReference: pair.token0.address,
      chainId,
    }),
  )

  const assetId0 =
    // Uniswap uses ERC20 WETH under the hood, but we want to display it as ETH
    pair.token0.address === WETH_TOKEN_CONTRACT_ADDRESS
      ? ethAssetId
      : toAssetId({
          assetNamespace: 'erc20',
          assetReference: pair.token0.address,
          chainId,
        })
  const assetId1 = toAssetId({
    assetNamespace: 'erc20',
    assetReference: pair.token1.address,
    chainId,
  })
  const underlyingAssetIds = [assetId0, assetId1] as const

  if (bnOrZero(token0MarketData?.price).isZero()) {
    throw new Error(`Market data not ready for ${underlyingAssetIds[0]}`)
  }

  const token0Price = token0MarketData.price

  const { assetReference: contractAddress } = fromAssetId(opportunityId)
  // TODO(gomes): discrimination required because of typechain
  // Import the standard UniV2 Pool ABI and cast `contractAddress` with it once we bring in Zerion SDK
  // And know that a specific token is a UniV2 LP
  const uniV2LPContract = getOrCreateContract(contractAddress as typeof foxEthLpContractAddress)
  const apy = bnOrZero(calculatedApy).div(100).toString()
  const reserves = await uniV2LPContract.getReserves()

  // Getting the ratio of the LP token for each asset
  const totalSupply = (await uniV2LPContract.totalSupply()).toString()
  const token0Reserves = bnOrZero(bnOrZero(reserves[0].toString()).toString())
  const token1Reserves = bnOrZero(bnOrZero(reserves[1].toString()).toString())
  const token0PoolRatio = token0Reserves.div(totalSupply).toString()
  const token1PoolRatio = token1Reserves.div(totalSupply).toString()
  // Amount of token 0 in liquidity pool
  const token0ReservesCryptoPrecision = bnOrZero(reserves?.[0]?.toString()).div(
    bn(10).pow(pair.token0.decimals ?? 18),
  )

  // TODO(gomes): This is a hackish way we were previously doing this, getting the ETH liquidity * 2 will get us close to the real fiat TVL but we can do better
  // Total market cap of liquidity pool in usdc.
  // Multiplied by 2 to show equal amount of token0 and token1.
  const totalLiquidityFiat = token0ReservesCryptoPrecision.times(token0Price).times(2)
  const tvl = totalLiquidityFiat.toString()
  const price = bnOrZero(tvl)
    .div(bnOrZero(totalSupply.toString()).div(bn(10).pow(pair.token1.decimals)))
    .toString()

  const lpMarketData = {
    [opportunityId]: { price, marketCap: '0', volume: '0', changePercent24Hr: 0 },
  }
  // hacks for adding lp price and price history
  dispatch(marketData.actions.setCryptoMarketData(lpMarketData))
  Object.values(HistoryTimeframe).forEach(timeframe => {
    dispatch(
      marketData.actions.setCryptoPriceHistory({
        data: [{ price: bnOrZero(price).toNumber(), date: 0 }],
        args: { timeframe, assetId: opportunityId },
      }),
    )
  })

  const data = {
    byId: {
      [opportunityId]: {
        apy,
        assetId: opportunityId,
        id: opportunityId,
        provider: DefiProvider.UniV2,
        tvl,
        type: DefiType.LiquidityPool,
        underlyingAssetId: opportunityId,
        underlyingAssetIds,
        underlyingAssetRatiosBaseUnit: [
          toBaseUnit(token0PoolRatio.toString(), pair.token0.decimals ?? 18),
          toBaseUnit(token1PoolRatio.toString(), pair.token1.decimals ?? 18),
        ] as const,
        name: `${assets.byId[underlyingAssetIds[0]]?.symbol}/${
          assets.byId[underlyingAssetIds[1]]?.symbol
        } Pool`,
      },
    },

    type: opportunityType,
  } as const

  return { data }
}

export const uniV2LpUserDataResolver = ({
  opportunityId,
  opportunityType: _opportunityType,
  accountId,
  reduxApi,
}: OpportunityUserDataResolverInput): Promise<void> => {
  const { chainId: accountChainId } = fromAccountId(accountId)
  // Looks the same as the happy path but isn't, we won't hit this as a guard with non-Ethereum account ChainIds
  if (accountChainId !== ethChainId) return Promise.resolve()

  const { getState } = reduxApi
  const state: ReduxState = getState() as any
  const portfolioLoadingStatusGranular = selectPortfolioLoadingStatusGranular(state)

  // Reject RTK query if account portfolio data is granularily loading
  if (portfolioLoadingStatusGranular?.[accountId] === 'loading')
    throw new Error(`Portfolio data not loaded for ${accountId}`)

  const balances: PortfolioAccountBalancesById = selectPortfolioAccountBalances(state)

  const hasPortfolioData = Boolean(balances[accountId][opportunityId])

  // Reject RTK query if there's no account portfolio data for this LP token
  if (!hasPortfolioData) {
    throw new Error('no portfolio data')
  }

  // All checks passed, resolve the promise so we continue the RTK query execution and populate LP/Account IDs
  return Promise.resolve()
}

export const uniV2LpLpOpportunityIdsResolver = (): Promise<{
  data: GetOpportunityIdsOutput
}> => Promise.resolve({ data: [...foxEthLpAssetIds] })
