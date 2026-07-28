import type { ParentToChildMessageReader, ParentToChildMessageReaderClassic } from '@arbitrum/sdk'
import { ParentToChildMessageStatus } from '@arbitrum/sdk'
import { arbitrumChainId } from '@shapeshiftoss/caip'
import { getEthersV5Provider } from '@shapeshiftoss/contracts'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import type { SwapperApi } from '../../types'
import { checkEvmSwapStatus } from '../../utils'
import { getEvmTransactionFees, getUnsignedEvmTransaction } from '../../utils/evm'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import type { ArbitrumBridgeTradeQuoteInput, ArbitrumBridgeTradeRateInput } from './types'
import { getParentToChildMessageDataFromParentTxHash } from './utils/helpers'

export const arbitrumBridgeApi: SwapperApi = {
  getTradeQuote: (input, deps) => getTradeQuote(input as ArbitrumBridgeTradeQuoteInput, deps),
  getTradeRate: (input, deps) => getTradeRate(input as ArbitrumBridgeTradeRateInput, deps),
  getUnsignedEvmTransaction,
  getEvmTransactionFees,
  checkTradeStatus: async ({
    txHash,
    chainId,
    assertGetEvmChainAdapter,
    address,
    fetchIsSmartContractAddressQuery,
  }) => {
    const swapTxStatus = await checkEvmSwapStatus({
      txHash,
      chainId,
      assertGetEvmChainAdapter,
      address,
      fetchIsSmartContractAddressQuery,
    })
    const isWithdraw = chainId === arbitrumChainId

    if (isWithdraw) {
      // We don't want to be polling for 7 days for Arb Child -> Parent, that's not very realistic for users.
      // We simply return success when the Child Tx is confirmed, meaning the trade will show "complete" almost instantly
      // and will handle the whole 7 days thing (that the user should've already been warned about with an ack before previewing)
      // at confirm step
      return {
        ...swapTxStatus,
        // Note, we don't care about the buyTxHash here, since it will be available... in 7 days.
        buyTxHash: undefined,
      }
    }

    if (swapTxStatus.status === TxStatus.Pending || swapTxStatus.status === TxStatus.Unknown) {
      return {
        status: TxStatus.Pending,
        buyTxHash: undefined,
        message: 'Parent Tx Pending',
      }
    }

    const parentProvider = getEthersV5Provider(KnownChainIds.EthereumMainnet)
    const childProvider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)
    const maybeParentToChildMessageData = await getParentToChildMessageDataFromParentTxHash({
      depositTxId: txHash,
      parentProvider,
      childProvider,
    })
    const maybeParentToChildMsg = maybeParentToChildMessageData?.parentToChildMsg
    const maybeBuyTxHash = await (async () => {
      if (!maybeParentToChildMsg) return

      if (maybeParentToChildMessageData?.isClassic) {
        const msg = maybeParentToChildMsg as ParentToChildMessageReaderClassic
        const receipt = await msg.getRetryableCreationReceipt()
        if (receipt?.status !== ParentToChildMessageStatus.REDEEMED) return
        return receipt.transactionHash
      } else {
        const msg = maybeParentToChildMsg as ParentToChildMessageReader
        const successfulRedeem = await msg.getSuccessfulRedeem()
        if (successfulRedeem.status !== ParentToChildMessageStatus.REDEEMED) return
        return successfulRedeem.childTxReceipt.transactionHash
      }
    })()

    if (!maybeBuyTxHash) {
      return {
        status: TxStatus.Pending,
        buyTxHash: maybeBuyTxHash,
        message: 'Parent Tx confirmed, waiting for Child',
      }
    }

    const childTxStatus = await checkEvmSwapStatus({
      txHash: maybeBuyTxHash,
      chainId: arbitrumChainId,
      assertGetEvmChainAdapter,
      address,
      fetchIsSmartContractAddressQuery,
    })

    // i.e Unknown is perfectly valid since ETH deposits Child Txids are available immediately deterministically, but will only be in the mempool after ~10mn
    if (childTxStatus.status === TxStatus.Pending || childTxStatus.status === TxStatus.Unknown) {
      return {
        status: TxStatus.Pending,
        buyTxHash: maybeBuyTxHash,
        message: 'Child Tx Pending',
      }
    }

    return {
      status: TxStatus.Confirmed,
      buyTxHash: maybeBuyTxHash,
      message: undefined,
    }
  },
}
