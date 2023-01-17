import { fromAccountId } from '@shapeshiftoss/caip'
import type { EvmBaseAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { convertHexToUtf8, convertNumberToHex } from '@walletconnect/utils'
import { getFeesForTx, getGasData } from 'plugins/walletConnectToDapps/utils'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import { useCallback } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import { selectPortfolioAccountMetadata } from 'state/slices/portfolioSlice/selectors'
import { useAppSelector } from 'state/store'

import type {
  WalletConnectEthSendTransactionCallRequest,
  WalletConnectEthSignCallRequest,
  WalletConnectEthSignTransactionCallRequest,
  WalletConnectEthSignTypedDataCallRequest,
  WalletConnectPersonalSignCallRequest,
} from './bridge/types'
import type { ConfirmData } from './components/modal/callRequest/CallRequestCommon'

const moduleLogger = logger.child({ namespace: ['WalletConnectBridge'] })

export const useApprovalHandler = () => {
  const { wcAccountId, signMessage } = useWalletConnect()
  const wallet = useWallet().state.wallet
  const accountMetadataById = useAppSelector(selectPortfolioAccountMetadata)

  const eth_sign = useCallback(
    async (request: WalletConnectEthSignCallRequest) => {
      return await signMessage(convertHexToUtf8(request.params[1]))
    },
    [signMessage],
  )

  const personal_sign = useCallback(
    async (request: WalletConnectPersonalSignCallRequest) => {
      return await signMessage(convertHexToUtf8(request.params[0]))
    },
    [signMessage],
  )

  const eth_signTypedData = useCallback(
    async (request: WalletConnectEthSignTypedDataCallRequest) => {
      const payloadString = request.params[1]
      const typedData = JSON.parse(payloadString)
      if (!typedData) return
      if (!wallet) return
      if (!wcAccountId) return
      const accountMetadata = accountMetadataById[wcAccountId]
      if (!accountMetadata) return
      const { bip44Params } = accountMetadata
      const addressNList = toAddressNList(bip44Params)
      const messageToSign = { addressNList, typedData }
      if (wallet instanceof KeepKeyHDWallet || wallet instanceof NativeHDWallet) {
        const signedMessage = await wallet?.ethSignTypedData(messageToSign)
        if (!signedMessage) throw new Error('WalletConnectBridgeProvider: signTypedData failed')
        return signedMessage.signature
      }
    },
    [accountMetadataById, wallet, wcAccountId],
  )

  const eth_sendTransaction = useCallback(
    async (request: WalletConnectEthSendTransactionCallRequest, approveData: ConfirmData) => {
      if (!wallet) return
      if (!wcAccountId) return
      const maybeChainAdapter = getChainAdapterManager().get(fromAccountId(wcAccountId).chainId)
      if (!maybeChainAdapter) return
      const chainAdapter = maybeChainAdapter as unknown as EvmBaseAdapter<EvmChainId>
      const tx = request.params[0]
      const maybeAdvancedParamsNonce = approveData.nonce
        ? convertNumberToHex(approveData.nonce)
        : null
      const didUserChangeNonce = maybeAdvancedParamsNonce && maybeAdvancedParamsNonce !== tx.nonce
      const fees = await getFeesForTx(tx, chainAdapter, wcAccountId)
      const gasData = getGasData(approveData, fees)
      const { bip44Params } = accountMetadataById[wcAccountId]
      const { accountNumber } = bip44Params
      const { txToSign: txToSignWithPossibleWrongNonce } = await chainAdapter.buildCustomTx({
        wallet,
        accountNumber,
        to: tx.to,
        data: tx.data,
        value: tx.value ?? convertNumberToHex(0),
        gasLimit:
          (approveData.gasLimit ? convertNumberToHex(approveData.gasLimit) : tx.gas) ??
          convertNumberToHex(9000), // https://docs.walletconnect.com/1.0/json-rpc-api-methods/ethereum#eth_sendtransaction
        ...gasData,
      })
      const txToSign = {
        ...txToSignWithPossibleWrongNonce,
        nonce: didUserChangeNonce ? maybeAdvancedParamsNonce : txToSignWithPossibleWrongNonce.nonce,
      }
      try {
        return await (async () => {
          if (wallet.supportsOfflineSigning()) {
            const signedTx = await chainAdapter.signTransaction({
              txToSign,
              wallet,
            })
            return chainAdapter.broadcastTransaction(signedTx)
          } else if (wallet.supportsBroadcast()) {
            return chainAdapter.signAndBroadcastTransaction({ txToSign, wallet })
          } else {
            throw new Error('Bad hdwallet config')
          }
        })()
      } catch (error) {
        moduleLogger.error(
          error,
          { fn: 'approveRequest:eth_sendTransaction' },
          'Error sending transaction',
        )
      }
    },
    [accountMetadataById, wallet, wcAccountId],
  )

  const eth_signTransaction = useCallback(
    async (request: WalletConnectEthSignTransactionCallRequest, approveData: ConfirmData) => {
      if (!wallet) return
      if (!wcAccountId) return
      const maybeChainAdapter = getChainAdapterManager().get(fromAccountId(wcAccountId).chainId)
      if (!maybeChainAdapter) return
      const chainAdapter = maybeChainAdapter as unknown as EvmBaseAdapter<EvmChainId>
      const tx = request.params[0]
      const addressNList = toAddressNList(accountMetadataById[wcAccountId].bip44Params)
      const nonce = approveData.nonce ? convertNumberToHex(approveData.nonce) : tx.nonce
      if (!nonce) return
      const gasLimit =
        (approveData.gasLimit ? convertNumberToHex(approveData.gasLimit) : tx.gas) ??
        convertNumberToHex(9000) // https://docs.walletconnect.com/1.0/json-rpc-api-methods/ethereum#eth_sendtransaction
      const fees = await getFeesForTx(tx, chainAdapter, wcAccountId)
      const gasData = getGasData(approveData, fees)
      return await chainAdapter.signTransaction({
        txToSign: {
          addressNList,
          chainId: parseInt(fromAccountId(wcAccountId).chainReference),
          data: tx.data,
          gasLimit,
          nonce,
          to: tx.to,
          value: tx.value ?? convertNumberToHex(0),
          ...gasData,
        },
        wallet,
      })
    },
    [accountMetadataById, wallet, wcAccountId],
  )

  return { eth_signTransaction, eth_sendTransaction, eth_signTypedData, personal_sign, eth_sign }
}
