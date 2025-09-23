import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  CHAIN_NAMESPACE,
  fromAccountId,
  fromChainId,
  rujiAssetId,
  tcyAssetId,
  thorchainAssetId,
  thorchainChainId,
} from '@shapeshiftoss/caip'
import type {
  BuildSendTxInput,
  FeeData,
  FeeDataEstimate,
  GetFeeDataInput,
} from '@shapeshiftoss/chain-adapters'
import { utxoChainIds } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH, supportsSolana } from '@shapeshiftoss/hdwallet-core'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import type { CosmosSdkChainId, EvmChainId, KnownChainIds, UtxoChainId } from '@shapeshiftoss/types'
import { contractAddressOrUndefined } from '@shapeshiftoss/utils'

import type { SendInput } from './Form'

import {
  checkIsMetaMaskDesktop,
  checkIsSnapInstalled,
} from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { assertGetChainAdapter } from '@/lib/utils'
import { assertGetCosmosSdkChainAdapter } from '@/lib/utils/cosmosSdk'
import { assertGetEvmChainAdapter, getSupportedEvmChainIds } from '@/lib/utils/evm'
import { assertGetSolanaChainAdapter } from '@/lib/utils/solana'
import { assertGetUtxoChainAdapter, isUtxoChainId } from '@/lib/utils/utxo'
import {
  selectAssetById,
  selectPortfolioAccountMetadataByAccountId,
} from '@/state/slices/selectors'
import { store } from '@/state/store'

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

export const estimateFees = async ({
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
    case CHAIN_NAMESPACE.Solana: {
      const adapter = assertGetSolanaChainAdapter(asset.chainId)

      // For SPL transfers, build complete instruction set including compute budget
      // For SOL transfers (pure sends i.e not e.g a Jup swap), pass no instructions to get 0 count (avoids blind signing)
      const instructions = contractAddress
        ? await adapter.buildEstimationInstructions({
            from: account,
            to,
            tokenId: contractAddress,
            value,
          })
        : undefined

      const getFeeDataInput: GetFeeDataInput<KnownChainIds.SolanaMainnet> = {
        to,
        value,
        chainSpecific: { from: account, tokenId: contractAddress, instructions },
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
  const { asset, chainId, accountMetadata, adapter } = prepareSendAdapter(sendInput)
  const supportedEvmChainIds = getSupportedEvmChainIds()
  const isMetaMaskDesktop = checkIsMetaMaskDesktop(wallet)
  if (
    fromChainId(asset.chainId).chainNamespace === CHAIN_NAMESPACE.CosmosSdk &&
    !wallet.supportsOfflineSigning() &&
    // MM only supports snap things... if the snap is installed
    (!isMetaMaskDesktop || (isMetaMaskDesktop && !(await checkIsSnapInstalled())))
  ) {
    throw new Error(`unsupported wallet: ${await wallet.getModel()}`)
  }

  const value = bnOrZero(sendInput.amountCryptoPrecision)
    .times(bn(10).exponentiatedBy(asset.precision))
    .toFixed(0)

  const { estimatedFees, feeType, to, memo, from } = sendInput
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

      const maybeCoin = (() => {
        // We only support coin sends for THORChain, not Cosmos SDK
        if (chainId !== thorchainChainId) return {}

        if (sendInput.assetId === tcyAssetId) return { coin: 'THOR.TCY' }
        if (sendInput.assetId === rujiAssetId) return { coin: 'THOR.RUJI' }
        if (sendInput.assetId === thorchainAssetId) return {}

        throw new Error('Unsupported THORChain asset')
      })()

      const params = {
        to,
        memo: (sendInput as SendInput<CosmosSdkChainId>).memo,
        value,
        wallet,
        accountNumber,
        chainSpecific: {
          gas: fees.chainSpecific.gasLimit,
          fee: fees.txFee,
          ...maybeCoin,
        },
        sendMax: sendInput.sendMax,
      }
      const adapter = assertGetCosmosSdkChainAdapter(chainId)
      return adapter.buildSendTransaction(params)
    }

    if (fromChainId(asset.chainId).chainNamespace === CHAIN_NAMESPACE.Solana) {
      if (!supportsSolana(wallet)) throw new Error(`useFormSend: wallet does not support solana`)

      const contractAddress = contractAddressOrUndefined(asset.assetId)
      const fees = estimatedFees[feeType] as FeeData<KnownChainIds.SolanaMainnet>

      const solanaAdapter = assertGetSolanaChainAdapter(chainId)
      const { account } = fromAccountId(sendInput.accountId)
      const instructions = await solanaAdapter.buildEstimationInstructions({
        from: account,
        to,
        tokenId: contractAddress,
        value,
      })

      const input: BuildSendTxInput<KnownChainIds.SolanaMainnet> = {
        to,
        value,
        wallet,
        accountNumber: bip44Params.accountNumber,
        chainSpecific:
          instructions.length <= 1
            ? {
                tokenId: contractAddress,
              }
            : {
                tokenId: contractAddress,
                computeUnitLimit: fees.chainSpecific.computeUnits,
                computeUnitPrice: fees.chainSpecific.priorityFee,
              },
      }

      return solanaAdapter.buildSendTransaction(input)
    }

    throw new Error(`${chainId} not supported`)
  })()

  const txToSign = result.txToSign

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

const prepareSendAdapter = (sendInput: SendInput) => {
  const state = store.getState()
  const asset = selectAssetById(state, sendInput.assetId ?? '')
  if (!asset) throw new Error(`No asset found for assetId ${sendInput.assetId}`)

  const chainId = asset.chainId
  const accountMetadata = selectPortfolioAccountMetadataByAccountId(state, {
    accountId: sendInput.accountId,
  })
  if (!accountMetadata) {
    throw new Error(`No accountMetadata found for ${sendInput.accountId}`)
  }

  const adapter = assertGetChainAdapter(chainId)

  return { asset, chainId, accountMetadata, adapter }
}

export const maybeFetchChangeAddress = async ({
  sendInput,
  wallet,
}: {
  sendInput: SendInput
  wallet: HDWallet
}): Promise<string | undefined> => {
  try {
    const { chainId, accountMetadata, adapter } = prepareSendAdapter(sendInput)

    // Only fetch for UTXO chains on Ledger wallets
    if (!isUtxoChainId(chainId) || !isLedger(wallet)) return undefined

    const changeAddress = await adapter.getAddress({
      accountNumber: accountMetadata.bip44Params.accountNumber,
      accountType: accountMetadata.accountType,
      wallet,
      isChange: true,
    })
    return changeAddress
  } catch (error) {
    console.error('Failed to fetch change address:', error)
    return undefined
  }
}
