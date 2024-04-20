import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { makeSwapErrorRight, TradeQuoteError } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { Err, Ok } from '@sniptt/monads'
import type { Token } from '@uniswap/sdk-core'
import type { FeeAmount } from '@uniswap/v3-sdk'
import assert from 'assert'
import type { Address, GetContractReturnType, PublicClient, WalletClient } from 'viem'
import { getContract } from 'viem'
import { viemClientByChainId } from 'lib/viem-client'

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
  const POOL_FACTORY_CONTRACT_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984' // FIXME: this is only true for Ethereum

  const publicClient = viemClientByChainId[buyAsset.chainId as EvmChainId]
  assert(publicClient !== undefined, `no public client found for chainId '${buyAsset.chainId}'`)

  const poolAddresses: Map<
    Address,
    { token0Address: Address; token1Address: Address; fee: FeeAmount }
  > = generateV3PoolAddressesAcrossFeeRange(POOL_FACTORY_CONTRACT_ADDRESS, sellToken, buyToken)

  const poolContractData = getContractDataByPool(
    poolAddresses,
    publicClient,
    sellToken.address,
    buyToken.address,
  )

  // TODO: Move these constants outside
  const QUOTER_CONTRACT_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6' // FIXME: this is only true for Ethereum
  const quoterContract: GetContractReturnType<typeof QuoterAbi, PublicClient, WalletClient> =
    getContract({
      abi: QuoterAbi,
      address: QUOTER_CONTRACT_ADDRESS,
      publicClient,
    })

  const quotedAmountOutByPool = await getQuotedAmountOutByPool(
    poolContractData,
    BigInt(sellAmountIncludingProtocolFeesCryptoBaseUnit),
    quoterContract,
  )

  const [bestPool, quotedAmountOut] = selectBestRate(quotedAmountOutByPool) ?? [
    undefined,
    undefined,
  ]

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
