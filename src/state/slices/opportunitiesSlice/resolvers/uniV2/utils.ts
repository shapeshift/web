import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { TokenAmount } from '@uniswap/sdk'
import type { IUniswapV2Pair } from 'contracts/__generated'
import { getOrCreateContractByType } from 'contracts/contractManager'
import { ContractType } from 'contracts/types'
import { ethers } from 'ethers'
import memoize from 'lodash/memoize'
import type { BN } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

import { TRADING_FEE_RATE } from './constants'

export const getToken0Volume24Hr = async ({
  blockNumber,
  uniswapLPContract,
}: {
  blockNumber: number
  uniswapLPContract: IUniswapV2Pair
}) => {
  const currentBlockNumber = blockNumber
  const yesterdayBlockNumber = currentBlockNumber - 6500 // ~6500 blocks per day

  let eventFilter = uniswapLPContract.filters.Swap()
  let events = await uniswapLPContract.queryFilter(
    eventFilter,
    yesterdayBlockNumber,
    currentBlockNumber,
  )

  const token0SwapAmounts = events.map(event => {
    if (!event?.args) return bn(0)
    const { amount0In, amount0Out } = event.args

    return Number(amount0In)
      ? bnOrZero(amount0In.toString())
      : bnOrZero(amount0Out.toString())
          .div(bn(1).minus(TRADING_FEE_RATE)) // Since these are outbound txs, this corrects the value to include trading fees taken out.
          .decimalPlaces(0)
  })

  const token0Volume24hr = token0SwapAmounts.reduce((a: BN, b: BN) => bnOrZero(a).plus(b))
  return token0Volume24hr.decimalPlaces(0).valueOf()
}

export const calculateAPRFromToken0 = memoize(
  async ({
    token0Decimals,
    token0Reserves,
    blockNumber,
    pairAssetId,
  }: {
    token0Decimals: number
    token0Reserves: TokenAmount | BN
    blockNumber: number
    pairAssetId: AssetId
  }) => {
    const { assetReference } = fromAssetId(pairAssetId)

    // Checksum
    const contractAddress = ethers.utils.getAddress(assetReference)
    const pair: IUniswapV2Pair = getOrCreateContractByType({
      address: contractAddress,
      type: ContractType.UniV2Pair,
    })

    const token0Volume24Hr = await getToken0Volume24Hr({
      blockNumber,
      uniswapLPContract: pair,
    })

    const token0PoolReservesEquivalent = bnOrZero(token0Reserves.toFixed())
      .times(2) // Double to get equivalent of both sides of pool
      .times(bn(10).pow(token0Decimals))

    const estimatedAPR = bnOrZero(token0Volume24Hr) // 24hr volume in terms of token0
      .div(token0PoolReservesEquivalent) // Total value (both sides) of pool reserves in terms of token0
      .times(TRADING_FEE_RATE) // Trading fee rate of pool
      .times(365.25) // Days in a year
      .times(100) // To get a percentage instead of a decimal
      .decimalPlaces(4)
      .valueOf()
    return estimatedAPR
  },
)
