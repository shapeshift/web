import type { Asset } from '@shapeshiftoss/asset-service'
import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAccountId, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { CosmosSdkChainId, FeeDataEstimate } from '@shapeshiftoss/chain-adapters'
import {
  type ChainAdapter,
  type EvmBaseAdapter,
  type EvmChainId,
  type FeeData,
  type UtxoBaseAdapter,
  type UtxoChainId,
  utxoChainIds,
} from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { getSupportedEvmChainIds } from 'hooks/useEvm/useEvm'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { tokenOrUndefined } from 'lib/utils'
import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/selectors'
import { store } from 'state/store'

import type { SendInput } from './Form'

export type EstimateFeesInput = {
  cryptoAmount: string
  asset: Asset
  address: string
  sendMax: boolean
  accountId: string
  contractAddress: string | undefined
}

const moduleLogger = logger.child({ namespace: ['Modals', 'Send', 'utils'] })

export const estimateFees = ({
  cryptoAmount,
  asset,
  address,
  sendMax,
  accountId,
  contractAddress,
}: EstimateFeesInput): Promise<FeeDataEstimate<ChainId>> => {
  const chainAdapterManager = getChainAdapterManager()
  const { account } = fromAccountId(accountId)
  const value = bnOrZero(cryptoAmount).times(bn(10).exponentiatedBy(asset.precision)).toFixed(0)

  const adapter = chainAdapterManager.get(asset.chainId)
  if (!adapter) throw new Error(`No adapter available for ${asset.chainId}`)

  const { chainNamespace } = fromChainId(asset.chainId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.CosmosSdk:
      return adapter.getFeeData({})
    case CHAIN_NAMESPACE.Evm:
      return (adapter as unknown as EvmBaseAdapter<EvmChainId>).getFeeData({
        to: address,
        value,
        chainSpecific: {
          from: account,
          contractAddress,
        },
        sendMax,
      })
    case CHAIN_NAMESPACE.Utxo: {
      return (adapter as unknown as UtxoBaseAdapter<UtxoChainId>).getFeeData({
        to: address,
        value,
        chainSpecific: { pubkey: account },
        sendMax,
      })
    }
    default:
      throw new Error(`${chainNamespace} not supported`)
  }
}

export const handleSend = async ({
  sendInput,
  wallet,
}: {
  sendInput: SendInput
  wallet: HDWallet
}): Promise<string> => {
  const chainAdapterManager = getChainAdapterManager()
  const supportedEvmChainIds = getSupportedEvmChainIds()

  try {
    const state = store.getState()
    const acccountMetadataFilter = { accountId: sendInput.accountId }
    const accountMetadata = selectPortfolioAccountMetadataByAccountId(state, acccountMetadataFilter)
    // Native and KeepKey hdwallets only support offline signing, not broadcasting signed TXs like e.g Metamask
    if (
      fromChainId(sendInput.asset.chainId).chainNamespace === CHAIN_NAMESPACE.CosmosSdk &&
      !wallet.supportsOfflineSigning()
    ) {
      throw new Error(`unsupported wallet: ${await wallet.getModel()}`)
    }

    const adapter = chainAdapterManager.get(sendInput.asset.chainId) as ChainAdapter<KnownChainIds>
    if (!adapter)
      throw new Error(`useFormSend: no adapter available for ${sendInput.asset.chainId}`)

    const value = bnOrZero(sendInput.cryptoAmount)
      .times(bn(10).exponentiatedBy(sendInput.asset.precision))
      .toFixed(0)

    const chainId = adapter.getChainId()

    const { estimatedFees, feeType, address: to } = sendInput

    if (!accountMetadata)
      throw new Error(`useFormSend: no accountMetadata for ${sendInput.accountId}`)
    const { bip44Params, accountType } = accountMetadata
    if (!bip44Params) {
      throw new Error(`useFormSend: no bip44Params for accountId ${sendInput.accountId}`)
    }

    const result = await (async () => {
      if (supportedEvmChainIds.includes(chainId)) {
        if (!supportsETH(wallet)) throw new Error(`useFormSend: wallet does not support ethereum`)
        const fees = estimatedFees[feeType] as FeeData<EvmChainId>
        const {
          chainSpecific: { gasPrice, gasLimit, maxFeePerGas, maxPriorityFeePerGas },
        } = fees
        const shouldUseEIP1559Fees =
          (await wallet.ethSupportsEIP1559()) &&
          maxFeePerGas !== undefined &&
          maxPriorityFeePerGas !== undefined
        if (!shouldUseEIP1559Fees && gasPrice === undefined) {
          throw new Error(`useFormSend: missing gasPrice for non-EIP-1559 tx`)
        }
        const erc20ContractAddress = tokenOrUndefined(
          fromAssetId(sendInput.asset.assetId).assetReference,
        )
        const { accountNumber } = bip44Params
        return await (adapter as unknown as EvmBaseAdapter<EvmChainId>).buildSendTransaction({
          to,
          value,
          wallet,
          accountNumber,
          chainSpecific: {
            erc20ContractAddress,
            gasLimit,
            ...(shouldUseEIP1559Fees ? { maxFeePerGas, maxPriorityFeePerGas } : { gasPrice }),
          },
          sendMax: sendInput.sendMax,
        })
      }

      if (utxoChainIds.some(utxoChainId => utxoChainId === chainId)) {
        const fees = estimatedFees[feeType] as FeeData<UtxoChainId>

        if (!accountType) {
          throw new Error(
            `useFormSend: no accountType for utxo from accountId: ${sendInput.accountId}`,
          )
        }
        const { accountNumber } = bip44Params
        return (adapter as unknown as UtxoBaseAdapter<UtxoChainId>).buildSendTransaction({
          to,
          value,
          wallet,
          accountNumber,
          chainSpecific: {
            satoshiPerByte: fees.chainSpecific.satoshiPerByte,
            accountType,
          },
          sendMax: sendInput.sendMax,
        })
      }

      if (fromChainId(sendInput.asset.chainId).chainNamespace === CHAIN_NAMESPACE.CosmosSdk) {
        const fees = estimatedFees[feeType] as FeeData<CosmosSdkChainId>
        const { accountNumber } = bip44Params
        return adapter.buildSendTransaction({
          to,
          memo: (sendInput as SendInput<CosmosSdkChainId>).memo,
          value,
          wallet,
          accountNumber,
          chainSpecific: { gas: fees.chainSpecific.gasLimit, fee: fees.txFee },
          sendMax: sendInput.sendMax,
        })
      }

      throw new Error(`${chainId} not supported`)
    })()

    const txToSign = result.txToSign

    const broadcastTXID = await (async () => {
      if (wallet.supportsOfflineSigning()) {
        const signedTx = await adapter.signTransaction({
          txToSign,
          wallet,
        })
        return adapter.broadcastTransaction(signedTx)
      } else if (wallet.supportsBroadcast()) {
        /**
         * signAndBroadcastTransaction is an optional method on the HDWallet interface.
         * Check and see if it exists; if so, call and make sure a txhash is returned
         */
        if (!adapter.signAndBroadcastTransaction) {
          throw new Error('signAndBroadcastTransaction undefined for wallet')
        }
        return adapter.signAndBroadcastTransaction?.({ txToSign, wallet })
      } else {
        throw new Error('Bad hdwallet config')
      }
    })()

    if (!broadcastTXID) {
      throw new Error('Broadcast failed')
    }

    return broadcastTXID
  } catch (error) {
    moduleLogger.error(error, { fn: 'handleSend' }, 'Error handling send')
    throw new Error('handleSend: transaction rejected')
  }
}
