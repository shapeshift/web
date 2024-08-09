import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAccountId, fromChainId } from '@shapeshiftoss/caip'
import type {
  CosmosSdkChainId,
  EvmChainId,
  FeeData,
  FeeDataEstimate,
  GetFeeDataInput,
  UtxoChainId,
} from '@shapeshiftoss/chain-adapters'
import { utxoChainIds } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { KnownChainIds } from '@shapeshiftoss/types'
import {
  checkIsMetaMaskDesktop,
  checkIsMetaMaskImpersonator,
  checkIsSnapInstalled,
} from 'hooks/useIsSnapInstalled/useIsSnapInstalled'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { assertGetChainAdapter, contractAddressOrUndefined } from 'lib/utils'
import { assertGetCosmosSdkChainAdapter } from 'lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter, getSupportedEvmChainIds } from 'lib/utils/evm'
import { assertGetUtxoChainAdapter } from 'lib/utils/utxo'
import { selectAssetById, selectPortfolioAccountMetadataByAccountId } from 'state/slices/selectors'
import { store } from 'state/store'

import type { SendInput } from './Form'

export type EstimateFeesInput = {
  amountCryptoPrecision: string
  assetId: AssetId
  // Optional hex-encoded calldata
  // for ERC-20s, use me in place of `data`
  memo?: string
  from?: string
  to: string
  sendMax: boolean
  accountId: AccountId
  contractAddress: string | undefined
}

export const estimateFees = ({
  amountCryptoPrecision,
  assetId,
  from,
  memo,
  to,
  sendMax,
  accountId,
  contractAddress,
}: EstimateFeesInput): Promise<FeeDataEstimate<ChainId>> => {
  const { account } = fromAccountId(accountId)
  const state = store.getState()
  const asset = selectAssetById(state, assetId)
  if (!asset) throw new Error(`Asset not found for ${assetId}`)
  const value = bnOrZero(amountCryptoPrecision)
    .times(bn(10).exponentiatedBy(asset.precision))
    .toFixed(0)

  const { chainNamespace } = fromChainId(asset.chainId)

  switch (chainNamespace) {
    case CHAIN_NAMESPACE.CosmosSdk: {
      const adapter = assertGetCosmosSdkChainAdapter(asset.chainId)
      const getFeeDataInput: Partial<GetFeeDataInput<CosmosSdkChainId>> = {}
      return adapter.getFeeData(getFeeDataInput)
    }
    case CHAIN_NAMESPACE.Evm: {
      const adapter = assertGetEvmChainAdapter(asset.chainId)
      const getFeeDataInput: GetFeeDataInput<EvmChainId> = {
        to,
        value,
        chainSpecific: {
          from: account,
          contractAddress,
          data: memo,
        },
        sendMax,
      }
      return adapter.getFeeData(getFeeDataInput)
    }
    case CHAIN_NAMESPACE.Utxo: {
      const adapter = assertGetUtxoChainAdapter(asset.chainId)
      const getFeeDataInput: GetFeeDataInput<UtxoChainId> = {
        to,
        value,
        chainSpecific: { from, pubkey: account },
        sendMax,
      }
      return adapter.getFeeData(getFeeDataInput)
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
  const supportedEvmChainIds = getSupportedEvmChainIds()

  const state = store.getState()
  const asset = selectAssetById(state, sendInput.assetId ?? '')
  if (!asset) return ''
  const acccountMetadataFilter = { accountId: sendInput.accountId }
  const accountMetadata = selectPortfolioAccountMetadataByAccountId(state, acccountMetadataFilter)
  const isMetaMaskDesktop = await checkIsMetaMaskDesktop(wallet)
  const isMetaMaskImpersonator = await checkIsMetaMaskImpersonator(wallet)
  if (
    fromChainId(asset.chainId).chainNamespace === CHAIN_NAMESPACE.CosmosSdk &&
    !wallet.supportsOfflineSigning() &&
    // MM impersonators don't support Cosmos SDK chains
    (!isMetaMaskDesktop ||
      isMetaMaskImpersonator ||
      (isMetaMaskDesktop && !(await checkIsSnapInstalled())))
  ) {
    throw new Error(`unsupported wallet: ${await wallet.getModel()}`)
  }

  const value = bnOrZero(sendInput.amountCryptoPrecision)
    .times(bn(10).exponentiatedBy(asset.precision))
    .toFixed(0)

  const chainId = asset.chainId

  const { estimatedFees, feeType, to, memo, from } = sendInput

  if (!accountMetadata)
    throw new Error(`useFormSend: no accountMetadata for ${sendInput.accountId}`)
  const { bip44Params, accountType } = accountMetadata
  if (!bip44Params) {
    throw new Error(`useFormSend: no bip44Params for accountId ${sendInput.accountId}`)
  }

  const result = await (async () => {
    if (supportedEvmChainIds.includes(chainId as KnownChainIds)) {
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
      const contractAddress = contractAddressOrUndefined(asset.assetId)
      const { accountNumber } = bip44Params
      const adapter = assertGetEvmChainAdapter(chainId)
      return await adapter.buildSendTransaction({
        to,
        value,
        wallet,
        accountNumber,
        chainSpecific: {
          data: memo,
          contractAddress,
          gasLimit,
          ...(shouldUseEIP1559Fees ? { maxFeePerGas, maxPriorityFeePerGas } : { gasPrice }),
        },
        sendMax: sendInput.sendMax,
        customNonce: sendInput.customNonce,
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
      const adapter = assertGetUtxoChainAdapter(chainId)
      return adapter.buildSendTransaction({
        to,
        value,
        wallet,
        accountNumber,
        chainSpecific: {
          from,
          satoshiPerByte: fees.chainSpecific.satoshiPerByte,
          accountType,
          opReturnData: memo,
        },
        sendMax: sendInput.sendMax,
      })
    }

    if (fromChainId(asset.chainId).chainNamespace === CHAIN_NAMESPACE.CosmosSdk) {
      const fees = estimatedFees[feeType] as FeeData<CosmosSdkChainId>
      const { accountNumber } = bip44Params
      const params = {
        to,
        memo: (sendInput as SendInput<CosmosSdkChainId>).memo,
        value,
        wallet,
        accountNumber,
        chainSpecific: { gas: fees.chainSpecific.gasLimit, fee: fees.txFee },
        sendMax: sendInput.sendMax,
      }
      const adapter = assertGetCosmosSdkChainAdapter(chainId)
      return adapter.buildSendTransaction(params)
    }

    throw new Error(`${chainId} not supported`)
  })()

  const txToSign = result.txToSign

  const adapter = assertGetChainAdapter(chainId)

  const senderAddress = await adapter.getAddress({
    accountNumber: accountMetadata.bip44Params.accountNumber,
    accountType: accountMetadata.accountType,
    wallet,
  })

  const broadcastTXID = await (async () => {
    if (wallet.supportsOfflineSigning()) {
      const signedTx = await adapter.signTransaction({
        txToSign,
        wallet,
      })
      return adapter.broadcastTransaction({
        senderAddress,
        receiverAddress: to,
        hex: signedTx,
      })
    } else if (wallet.supportsBroadcast()) {
      /**
       * signAndBroadcastTransaction is an optional method on the HDWallet interface.
       * Check and see if it exists; if so, call and make sure a txhash is returned
       */
      if (!adapter.signAndBroadcastTransaction) {
        throw new Error('signAndBroadcastTransaction undefined for wallet')
      }
      return adapter.signAndBroadcastTransaction({
        senderAddress,
        receiverAddress: to,
        signTxInput: { txToSign, wallet },
      })
    } else {
      throw new Error('Bad hdwallet config')
    }
  })()

  if (!broadcastTXID) {
    throw new Error('Broadcast failed')
  }

  return broadcastTXID
}
