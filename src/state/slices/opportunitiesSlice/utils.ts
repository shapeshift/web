import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, fromAssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { Fetcher, Token } from '@uniswap/sdk'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { foxEthLpAssetId } from 'features/defi/providers/fox-eth-lp/constants'
import { FOX_TOKEN_CONTRACT_ADDRESS, WETH_TOKEN_CONTRACT_ADDRESS } from 'plugins/foxPage/const'
import { calculateAPRFromToken0, getEthersProvider } from 'plugins/foxPage/utils'
import { bnOrZero } from 'lib/bignumber/bignumber'

import type { AssetsState } from '../assetsSlice/assetsSlice'
import { getOrCreateContract } from '../foxEthSlice/contractManager'
import { fetchPairData } from '../foxEthSlice/utils'
import { marketData } from '../marketDataSlice/marketDataSlice'
import { selectMarketDataById } from '../selectors'
import { STAKING_ID_DELIMITER } from './constants'
import type { StakingId, UserStakingId } from './opportunitiesSlice'

export type UserStakingIdParts = [accountId: AccountId, stakingId: StakingId]

export const deserializeUserStakingId = (userStakingId: UserStakingId): UserStakingIdParts => {
  const parts = userStakingId.split(STAKING_ID_DELIMITER)

  const [accountId, stakingId] = parts

  if (!(accountId && stakingId)) throw new Error('Error deserializing UserStakingId')

  return [accountId, stakingId]
}

export const serializeUserStakingId = (
  ...[accountId, stakingId]: UserStakingIdParts
): UserStakingId => `${accountId}${STAKING_ID_DELIMITER}${stakingId}`

export const filterUserStakingIdByStakingIdCompareFn = (
  userStakingId: UserStakingId,
  stakingId: StakingId,
) => {
  const parts = deserializeUserStakingId(userStakingId)
  const [, deserializedStakingId] = parts

  return deserializedStakingId === stakingId
}

export const DefiProviderToResolverByDeFiType: Record<DefiProvider, any> = {
  [DefiProvider.FoxFarming]: {
    [DefiType.LiquidityPool]: async (opportunityId, opportunityType, { dispatch, getState }) => {
      // TODO: protocol agnostic, this is EVM specific
      const { assetReference: contractAddress } = fromAssetId(opportunityId as AccountId) // TODO: abstract me, for EVM LPs an opportunity is an AccountId, but not always true for others
      const state: any = getState() // ReduxState causes circular dependency
      const assets: AssetsState = state.assets
      const ethMarketData: MarketData = selectMarketDataById(state, ethAssetId)

      if (!ethMarketData?.price) {
        throw new Error(`Market data not ready for ${ethAssetId}`)
      }

      const ethPrecision = assets.byId[ethAssetId].precision
      const lpAssetPrecision = assets.byId[foxEthLpAssetId].precision
      const ethPrice = ethMarketData.price
      const ethersProvider = getEthersProvider()
      const uniV2LPContract = getOrCreateContract(contractAddress, IUniswapV2Pair.abi)
      const pair = await fetchPairData(
        new Token(0, WETH_TOKEN_CONTRACT_ADDRESS, 18),
        new Token(0, FOX_TOKEN_CONTRACT_ADDRESS, 18),
        Fetcher.fetchPairData,
        ethersProvider,
      )

      const blockNumber = await ethersProvider.getBlockNumber()

      const calculatedApy = await calculateAPRFromToken0({
        token0Decimals: pair.token0.decimals,
        token0Reserves: pair.reserve0,
        blockNumber,
        uniswapLPContract: uniV2LPContract,
      })
      const apy = bnOrZero(calculatedApy).div(100).toString()
      const reserves = await uniV2LPContract.getReserves()
      // Amount of Eth in liquidity pool
      const ethInReserve = bnOrZero(reserves?.[0]?.toString()).div(`1e${ethPrecision}`)

      // Total market cap of liquidity pool in usdc.
      // Multiplied by 2 to show equal amount of eth and fox.
      const totalLiquidity = ethInReserve.times(ethPrice).times(2)
      const tvl = totalLiquidity.toString()
      const totalSupply = await uniV2LPContract.totalSupply()
      const price = bnOrZero(tvl)
        .div(bnOrZero(totalSupply.toString()).div(`1e${lpAssetPrecision}`))
        .toString()
      const lpMarketData = {
        [foxEthLpAssetId]: { price, marketCap: '0', volume: '0', changePercent24Hr: 0 },
      }
      // hacks for adding lp price and price history
      dispatch(marketData.actions.setCryptoMarketData(lpMarketData))
      Object.values(HistoryTimeframe).forEach(timeframe => {
        dispatch(
          marketData.actions.setCryptoPriceHistory({
            data: [{ price: bnOrZero(price).toNumber(), date: 0 }],
            args: { timeframe, assetId: foxEthLpAssetId },
          }),
        )
      })

      const data = {
        metadata: {
          [opportunityId]: {
            apy,
            assetId: opportunityId,
            provider: DefiProvider.FoxEthLP,
            tvl,
            type: DefiType.LiquidityPool,
            underlyingAssetIds: [],
          },
        },
        type: opportunityType,
      }

      return { data }
    },
  },
}
