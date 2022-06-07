import { fromAssetId } from '@shapeshiftoss/caip'
import { ethereum } from '@shapeshiftoss/chain-adapters'
import { ETHSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'
import { Asset, BIP44Params } from '@shapeshiftoss/types'
import BigNumber from 'bignumber.js'

import { SwapError, SwapErrorTypes } from '../../../../api'
import { bnOrZero } from '../../../utils/bignumber'
import { InboundResponse, ThorchainSwapperDeps } from '../../types'
import { getPriceRatio } from '../getPriceRatio/getPriceRatio'
import { makeSwapMemo } from '../makeSwapMemo/makeSwapMemo'
import { thorService } from '../thorService'
import { deposit } from './routerCalldata'

export const fromBaseUnit = (
  value: BigNumber.Value,
  decimals: number,
  displayDecimals = 6
): string => {
  return bnOrZero(value)
    .div(`1e+${decimals}`)
    .decimalPlaces(displayDecimals, BigNumber.ROUND_DOWN)
    .toString()
}

export const toBaseUnit = (amount: BigNumber.Value | undefined, precision: number): string => {
  return bnOrZero(amount)
    .times(new BigNumber(10).exponentiatedBy(bnOrZero(precision)))
    .toFixed(0)
}

export const makeTradeTx = async ({
  wallet,
  bip44Params,
  sellAmount,
  buyAsset,
  sellAsset,
  destinationAddress,
  adapter,
  maxFeePerGas,
  maxPriorityFeePerGas,
  slippageTolerance,
  deps,
  gasLimit
}: {
  wallet: HDWallet
  bip44Params: BIP44Params
  sellAmount: string
  buyAsset: Asset
  sellAsset: Asset
  destinationAddress: string
  adapter: ethereum.ChainAdapter
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  slippageTolerance: string
  deps: ThorchainSwapperDeps
  gasLimit: string
}): Promise<{
  txToSign: ETHSignTx
}> => {
  try {
    const { assetReference } = fromAssetId(sellAsset.assetId)

    const isErc20Trade = assetReference.startsWith('0x')

    const { data: inboundAddresses } = await thorService.get<InboundResponse[]>(
      `${deps.midgardUrl}/thorchain/inbound_addresses`
    )

    const ethInboundAddresses = inboundAddresses.find((inbound) => inbound.chain === 'ETH')

    const vault = ethInboundAddresses?.address
    const router = ethInboundAddresses?.router

    if (!vault || !router)
      throw new SwapError(`[getPriceRatio]: router or vault found for ETH`, {
        code: SwapErrorTypes.RESPONSE_ERROR,
        details: { inboundAddresses }
      })

    const priceRatio = await getPriceRatio(deps, {
      buyAssetId: buyAsset.assetId,
      sellAssetId: sellAsset.assetId
    })
    const expectedBuyAmount = toBaseUnit(
      fromBaseUnit(bnOrZero(sellAmount).dividedBy(priceRatio), sellAsset.precision),
      buyAsset.precision
    )

    if (
      !bnOrZero(expectedBuyAmount).gte(0) ||
      !(bnOrZero(slippageTolerance).gte(0) && bnOrZero(slippageTolerance).lte(1))
    )
      throw new SwapError('[makeTradeTx]: bad expected buy amount or bad slippage tolerance', {
        code: SwapErrorTypes.BUILD_TRADE_FAILED
      })

    const limit = bnOrZero(expectedBuyAmount)
      .times(new BigNumber(1).minus(slippageTolerance))
      .decimalPlaces(0)
      .toString()

    const memo = makeSwapMemo({
      buyAssetId: buyAsset.assetId,
      destinationAddress,
      limit
    })

    const data = await deposit(
      vault,
      router,
      isErc20Trade ? assetReference : '0x0000000000000000000000000000000000000000',
      sellAmount,
      memo
    )

    return adapter.buildCustomTx({
      wallet,
      bip44Params,
      to: router,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      value: isErc20Trade ? '0' : sellAmount,
      data
    })
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[makeTradeTx]: error making trade tx', {
      code: SwapErrorTypes.BUILD_TRADE_FAILED,
      cause: e
    })
  }
}
