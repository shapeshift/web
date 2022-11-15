import { Contract } from '@ethersproject/contracts'
import { fromAssetId } from '@shapeshiftoss/caip'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { getEthersProvider } from 'plugins/foxPage/utils'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'

export const getLpTokenPrice = async (
  ethPrecision: number,
  ethPrice: string,
  lpAssetPrecision: number,
) => {
  const ethersProvider = getEthersProvider()
  const uniV2LPContract = new Contract(
    fromAssetId(foxEthLpAssetId).assetReference,
    IUniswapV2Pair.abi,
    ethersProvider,
  )
  const reserves = await uniV2LPContract.getReserves()
  // Amount of Eth in liquidity pool
  const ethInReserve = bnOrZero(reserves?.[0]?.toString()).div(`1e${ethPrecision}`)

  // Total market cap of liquidity pool in usdc.
  // Multiplied by 2 to show equal amount of eth and fox.
  const totalLiquidity = ethInReserve.times(ethPrice).times(2)
  const tvl = totalLiquidity.toString()
  const totalSupply = await uniV2LPContract.totalSupply()
  return bnOrZero(tvl)
    .div(bnOrZero(totalSupply.toString()).div(`1e${lpAssetPrecision}`))
    .toString()
}
