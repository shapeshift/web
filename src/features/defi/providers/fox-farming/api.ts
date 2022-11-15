import { Contract } from '@ethersproject/contracts'
import { fromAssetId } from '@shapeshiftoss/caip'
import { Fetcher, Token } from '@uniswap/sdk'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import dayjs from 'dayjs'
import { FOX_TOKEN_CONTRACT_ADDRESS, WETH_TOKEN_CONTRACT_ADDRESS } from 'plugins/foxPage/const'
import { getEthersProvider, makeTotalLpApr, rewardRatePerToken } from 'plugins/foxPage/utils'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { uniswapV2Router02AssetId } from 'state/slices/opportunitiesSlice/constants'

import { getLpTokenPrice } from '../fox-eth-lp/api'
import farmAbi from './abis/farmingAbi.json'

export const getOpportunityData = async ({
  contractAddress,
  ethAssetPrecision,
  ethPrice,
  lpAssetPrecision,
  foxAssetPrecision,
  foxPrice,
  userAddress,
}: {
  contractAddress: string
  ethAssetPrecision: number
  ethPrice: string
  lpAssetPrecision: number
  foxAssetPrecision: number
  foxPrice: string
  userAddress: string
}) => {
  const ethersProvider = getEthersProvider()
  const foxFarmingContract = new Contract(contractAddress, farmAbi, ethersProvider)
  const uniV2LPContract = new Contract(
    fromAssetId(uniswapV2Router02AssetId).assetReference,
    IUniswapV2Pair.abi,
    ethersProvider,
  )

  // tvl
  const totalSupply = await foxFarmingContract.totalSupply()
  const lpTokenPrice = await getLpTokenPrice(ethAssetPrecision, ethPrice, lpAssetPrecision)
  if (!lpTokenPrice) return ''
  const totalDeposited = bnOrZero(totalSupply.toString())
    .div(`1e${lpAssetPrecision}`)
    .times(lpTokenPrice)
    .toFixed(2)

  // apr
  const foxRewardRatePerTokenV4 = await rewardRatePerToken(foxFarmingContract)
  const pair = await Fetcher.fetchPairData(
    new Token(0, WETH_TOKEN_CONTRACT_ADDRESS, 18),
    new Token(0, FOX_TOKEN_CONTRACT_ADDRESS, 18),
    ethersProvider,
  )

  const totalSupplyV2 = await uniV2LPContract.totalSupply()

  const token1PoolReservesEquivalent = bnOrZero(pair.reserve1.toFixed())
    .times(2) // Double to get equivalent of both sides of pool
    .times(`1e+${pair.token1.decimals}`) // convert to base unit value

  const foxEquivalentPerLPToken = token1PoolReservesEquivalent
    .div(bnOrZero(totalSupplyV2.toString()))
    .times(`1e+${pair.token1.decimals}`) // convert to base unit value
    .toString()
  const apr = bnOrZero(makeTotalLpApr(foxRewardRatePerTokenV4, foxEquivalentPerLPToken))
    .div(100)
    .toString()

  // balances
  const stakedBalance = await foxFarmingContract.balanceOf(userAddress)
  const rewardsAmountCryptoPrecision = await foxFarmingContract.earned(userAddress)
  const stakedAmount = bnOrZero(stakedBalance.toString()).div(`1e${lpAssetPrecision}`)
  const stakeFiatBalance = stakedAmount.times(lpTokenPrice)
  const rewardsAmountCryptoPrecisionCryptoAmount = bnOrZero(
    rewardsAmountCryptoPrecision.toString(),
  ).div(`1e${foxAssetPrecision}`)
  const rewardsAmountCryptoPrecisionFiatBalance =
    rewardsAmountCryptoPrecisionCryptoAmount.times(foxPrice)

  // expired
  let expired
  const timeStamp = await foxFarmingContract.periodFinish()
  if (timeStamp.toNumber() === 0) {
    expired = false
  } else {
    expired = dayjs().isAfter(dayjs.unix(timeStamp.toNumber()))
  }
  return {
    tvl: totalDeposited,
    expired,
    apr,
    balances: {
      cryptoBalance: stakedAmount.toString(),
      fiatBalance: stakeFiatBalance.plus(rewardsAmountCryptoPrecisionFiatBalance).toFixed(2),
      rewardsAmountCryptoPrecision: rewardsAmountCryptoPrecisionCryptoAmount.toString(),
    },
  }
}
