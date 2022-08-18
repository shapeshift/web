import { Contract } from '@ethersproject/contracts'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { getEthersProvider } from 'plugins/foxPage/utils'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { UNISWAP_V2_WETH_FOX_POOL_ADDRESS } from './constants'

export const getLpTokenPrice = async (
  ethPecision: number,
  ethPrice: string,
  lpAssetPrecision: number,
) => {
  const ethersProvider = getEthersProvider()
  const uniV2LPContract = new Contract(
    UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
    IUniswapV2Pair.abi,
    ethersProvider,
  )
  const reserves = await uniV2LPContract.getReserves()
  // Amount of Eth in liquidity pool
  const ethInReserve = bnOrZero(reserves?.[0]?.toString()).div(`1e${ethPecision}`)

  // Total market cap of liquidity pool in usdc.
  // Multiplied by 2 to show equal amount of eth and fox.
  const totalLiquidity = ethInReserve.times(ethPrice).times(2)
  const tvl = totalLiquidity.toString()
  const totalSupply = await uniV2LPContract.totalSupply()
  return bnOrZero(tvl)
    .div(bnOrZero(totalSupply.toString()).div(`1e${lpAssetPrecision}`))
    .toString()
}
