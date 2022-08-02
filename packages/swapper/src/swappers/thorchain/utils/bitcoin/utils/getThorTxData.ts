import { Asset } from '@shapeshiftoss/asset-service'
import { btcChainId } from '@shapeshiftoss/caip'
import { bitcoin } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { BIP44Params, UtxoAccountType } from '@shapeshiftoss/types'

import { SwapError, SwapErrorTypes } from '../../../../../api'
import { InboundResponse, ThorchainSwapperDeps } from '../../../types'
import { getLimit } from '../../getLimit/getLimit'
import { makeSwapMemo } from '../../makeSwapMemo/makeSwapMemo'
import { thorService } from '../../thorService'

type GetBtcThorTxInfoArgs = {
  deps: ThorchainSwapperDeps
  sellAsset: Asset
  buyAsset: Asset
  sellAmount: string
  slippageTolerance: string
  destinationAddress: string
  wallet: HDWallet
  bip44Params: BIP44Params
  accountType: UtxoAccountType
  tradeFee: string
}
type GetBtcThorTxInfoReturn = Promise<{
  opReturnData: string
  vault: string
  pubkey: string
}>
type GetBtcThorTxInfo = (args: GetBtcThorTxInfoArgs) => GetBtcThorTxInfoReturn

export const getThorTxInfo: GetBtcThorTxInfo = async ({
  deps,
  sellAsset,
  buyAsset,
  sellAmount,
  slippageTolerance,
  destinationAddress,
  wallet,
  bip44Params,
  accountType,
  tradeFee
}) => {
  try {
    const { data: inboundAddresses } = await thorService.get<InboundResponse[]>(
      `${deps.midgardUrl}/thorchain/inbound_addresses`
    )

    const btcInboundAddresses = inboundAddresses.find((inbound) => inbound.chain === 'BTC')

    const vault = btcInboundAddresses?.address

    if (!vault)
      throw new SwapError(`[getThorTxInfo]: vault not found for BTC`, {
        code: SwapErrorTypes.RESPONSE_ERROR,
        details: { inboundAddresses }
      })

    const limit = await getLimit({
      buyAssetId: buyAsset.assetId,
      destinationAddress,
      sellAmount,
      sellAsset,
      buyAsset,
      slippageTolerance,
      deps,
      tradeFee
    })

    const memo = makeSwapMemo({
      buyAssetId: buyAsset.assetId,
      destinationAddress,
      limit
    })

    const adapter = deps.adapterManager.get(btcChainId)

    const pubkey = await (adapter as unknown as bitcoin.ChainAdapter).getPublicKey(
      wallet,
      bip44Params,
      accountType
    )

    return {
      opReturnData: memo,
      vault,
      pubkey: pubkey.xpub
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getThorTxInfo]', { cause: e, code: SwapErrorTypes.TRADE_QUOTE_FAILED })
  }
}
