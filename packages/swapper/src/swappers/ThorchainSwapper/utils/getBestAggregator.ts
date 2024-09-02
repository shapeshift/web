import { viemClientByChainId } from '@shapeshiftoss/contracts'
import type { Asset, EvmChainId } from '@shapeshiftoss/types'
import { Err, Ok } from '@sniptt/monads'
import type { Token } from '@uniswap/sdk-core'
import type { FeeAmount } from '@uniswap/v3-sdk'
import assert from 'assert'
import type { Address, GetContractReturnType, PublicClient } from 'viem'
import { getContract } from 'viem'

import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import {
  UNI_V3_ETHEREUM_POOL_FACTORY_CONTRACT_ADDRESS,
  UNI_V3_ETHEREUM_QUOTER_ADDRESS,
} from '../constants'
import { QuoterAbi } from '../getThorTradeQuote/abis/QuoterAbi'
import {
  feeAmountToContractMap,
  generateV3PoolAddressesAcrossFeeRange,
  getContractDataByPool,
  getQuotedAmountOutByPool,
  selectBestRate,
} from './longTailHelpers'

export const getBestAggregator = async (
  buyAsset: Asset,
  sellToken: Token,
  buyToken: Token,
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string,
) => {
  const publicClient = viemClientByChainId[buyAsset.chainId as EvmChainId]
  assert(publicClient !== undefined, `no public client found for chainId '${buyAsset.chainId}'`)

  const poolAddresses: Map<
    Address,
    { token0Address: Address; token1Address: Address; fee: FeeAmount }
  > = generateV3PoolAddressesAcrossFeeRange(
    UNI_V3_ETHEREUM_POOL_FACTORY_CONTRACT_ADDRESS,
    sellToken,
    buyToken,
  )

  const poolContractData = getContractDataByPool(
    poolAddresses,
    publicClient,
    sellToken.address,
    buyToken.address,
  )

  const quoterContract: GetContractReturnType<typeof QuoterAbi, PublicClient, Address> =
    getContract({
      abi: QuoterAbi,
      address: UNI_V3_ETHEREUM_QUOTER_ADDRESS,
      client: publicClient,
    })

  const quotedAmountOutByPool = await getQuotedAmountOutByPool(
    poolContractData,
    BigInt(sellAmountIncludingProtocolFeesCryptoBaseUnit),
    quoterContract,
  )

  const [bestPool, quotedAmountOut] = selectBestRate(quotedAmountOutByPool)

  const bestContractData = bestPool ? poolContractData.get(bestPool) : undefined
  const bestAggregator = bestContractData ? feeAmountToContractMap[bestContractData.fee] : undefined

  if (!bestAggregator || !quotedAmountOut) {
    return Err(
      makeSwapErrorRight({
        message: `[getThorTradeQuote] - No best aggregator contract found.`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  return Ok({ bestAggregator, quotedAmountOut })
}
