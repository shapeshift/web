import { bnOrZero } from 'lib/bignumber/bignumber'
import { foxEthLpContractAddress } from 'state/slices/opportunitiesSlice/constants'
import { getOrCreateContract } from 'state/slices/opportunitiesSlice/resolvers/foxFarming/contractManager'

export const getLpTokenPrice = async (
  ethPrecision: number,
  ethPrice: string,
  lpAssetPrecision: number,
) => {
  const uniV2LPContract = getOrCreateContract(foxEthLpContractAddress)
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
