import { Asset as DedustAsset, JettonRoot, VaultJetton } from '@dedust/sdk'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Address } from '@ton/core'
import { address as tonAddress, beginCell, toNano } from '@ton/core'

import type { SwapperApi, TradeStatus } from '../../types'
import {
  createDefaultStatusResponse,
  getExecutableTradeStep,
  isExecutableTradeQuote,
} from '../../utils'
import { getTradeQuote } from './swapperApi/getTradeQuote'
import { getTradeRate } from './swapperApi/getTradeRate'
import { dedustClientManager } from './utils/dedustClient'

const SWAP_DEADLINE_SECONDS = 300
const VAULT_NATIVE_SWAP_OPCODE = 0xea06185d

const buildNativeTonSwapMessage = async (
  poolAddress: string,
  sellAmount: string,
  minBuyAmount: string,
  gasBudget: string,
) => {
  const client = dedustClientManager.getClient()
  const factory = dedustClientManager.getFactory()

  const nativeVault = client.open(await factory.getNativeVault())
  const nativeVaultAddress = nativeVault.address.toString()

  const deadline = Math.floor(Date.now() / 1000) + SWAP_DEADLINE_SECONDS
  const swapParamsCell = beginCell()
    .storeUint(deadline, 32)
    .storeAddress(null)
    .storeAddress(null)
    .storeMaybeRef(null)
    .storeMaybeRef(null)
    .endCell()

  const swapPayload = beginCell()
    .storeUint(VAULT_NATIVE_SWAP_OPCODE, 32)
    .storeUint(0, 64)
    .storeCoins(BigInt(sellAmount))
    .storeAddress(tonAddress(poolAddress))
    .storeUint(0, 1)
    .storeCoins(BigInt(minBuyAmount))
    .storeMaybeRef(null)
    .storeRef(swapParamsCell)
    .endCell()

  const totalSendAmount = (BigInt(sellAmount) + BigInt(gasBudget)).toString()

  return {
    targetAddress: nativeVaultAddress,
    sendAmount: totalSendAmount,
    payload: swapPayload.toBoc().toString('hex'),
    stateInit: undefined,
  }
}

const buildJettonSwapMessage = async (
  from: string,
  poolAddress: string,
  sellAssetAddress: string,
  sellAmount: string,
  minBuyAmount: string,
  gasBudget: string,
) => {
  const client = dedustClientManager.getClient()
  const factory = dedustClientManager.getFactory()

  const jettonMasterAddr = tonAddress(sellAssetAddress)
  const jettonAsset = DedustAsset.jetton(jettonMasterAddr)
  const jettonVault = client.open(await factory.getJettonVault(jettonAsset.address as Address))

  const swapPayload = VaultJetton.createSwapPayload({
    poolAddress: tonAddress(poolAddress),
    limit: BigInt(minBuyAmount),
    swapParams: {
      deadline: Math.floor(Date.now() / 1000) + SWAP_DEADLINE_SECONDS,
    },
  })

  const jettonRoot = client.open(JettonRoot.createFromAddress(jettonMasterAddr))
  const fromAddress = tonAddress(from)
  const jettonWallet = await jettonRoot.getWallet(fromAddress)

  const jettonTransferPayload = beginCell()
    .storeUint(0xf8a7ea5, 32)
    .storeUint(0, 64)
    .storeCoins(BigInt(sellAmount))
    .storeAddress(jettonVault.address)
    .storeAddress(fromAddress)
    .storeBit(false)
    .storeCoins(toNano('0.25'))
    .storeBit(true)
    .storeRef(swapPayload)
    .endCell()

  return {
    targetAddress: jettonWallet.address.toString(),
    sendAmount: gasBudget,
    payload: jettonTransferPayload.toBoc().toString('hex'),
    stateInit: undefined,
  }
}

export const dedustApi: SwapperApi = {
  getTradeQuote: (input, _deps) => getTradeQuote(input),
  getTradeRate: input => getTradeRate(input),

  getUnsignedTonTransaction: async ({ stepIndex, tradeQuote, from, assertGetTonChainAdapter }) => {
    if (!isExecutableTradeQuote(tradeQuote)) {
      throw new Error('Unable to execute a trade rate quote')
    }

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    const { accountNumber, sellAsset, dedustSpecific } = step

    if (!dedustSpecific) {
      throw new Error('dedustSpecific is required')
    }

    const adapter = assertGetTonChainAdapter(sellAsset.chainId)

    const { poolAddress, sellAssetAddress, sellAmount, minBuyAmount, gasBudget } = dedustSpecific

    const maxRetries = 3
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const isNativeSwap = sellAssetAddress === 'native'

        const rawMessage = isNativeSwap
          ? await buildNativeTonSwapMessage(poolAddress, sellAmount, minBuyAmount, gasBudget)
          : await buildJettonSwapMessage(
              from,
              poolAddress,
              sellAssetAddress,
              sellAmount,
              minBuyAmount,
              gasBudget,
            )

        const seqno = await adapter.getSeqno(from)
        const expireAt = Math.floor(Date.now() / 1000) + SWAP_DEADLINE_SECONDS

        return {
          addressNList: toAddressNList(adapter.getBip44Params({ accountNumber })),
          rawMessages: [rawMessage],
          seqno,
          expireAt,
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        console.error(
          `[DeDust] buildTransaction attempt ${attempt}/${maxRetries} failed:`,
          lastError.message,
        )

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
      }
    }

    throw lastError ?? new Error('Failed to build transfer after retries')
  },

  getTonTransactionFees: ({ tradeQuote, stepIndex }) => {
    if (!isExecutableTradeQuote(tradeQuote)) {
      throw new Error('Unable to execute a trade rate quote')
    }

    const step = getExecutableTradeStep(tradeQuote, stepIndex)
    if (!step.feeData.networkFeeCryptoBaseUnit) {
      throw new Error('Missing network fee in quote')
    }
    return Promise.resolve(step.feeData.networkFeeCryptoBaseUnit)
  },

  checkTradeStatus: async ({ swap, assertGetTonChainAdapter }): Promise<TradeStatus> => {
    if (!swap?.sellTxHash) {
      return createDefaultStatusResponse()
    }

    const { sellTxHash } = swap

    try {
      const adapter = assertGetTonChainAdapter(swap.sellAsset.chainId)
      const tx = await adapter.parseTx(sellTxHash, '')

      return {
        status: tx.status,
        buyTxHash: tx.status === TxStatus.Confirmed ? sellTxHash : undefined,
        message: undefined,
      }
    } catch (err) {
      console.error('[DeDust] Error checking tx status via chain adapter:', err)
      return createDefaultStatusResponse(sellTxHash)
    }
  },
}
