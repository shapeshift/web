import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { EvmBaseAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { ethers } from 'ethers'
import { convertNumberToHex, getFeesForTx, getGasData } from 'plugins/walletConnectToDapps/utils'
import type {
  WalletConnectEthSendTransactionCallRequest,
  WalletConnectEthSignCallRequest,
  WalletConnectEthSignTransactionCallRequest,
  WalletConnectEthSignTypedDataCallRequest,
  WalletConnectPersonalSignCallRequest,
} from 'plugins/walletConnectToDapps/v1/bridge/types'
import type { ConfirmData } from 'plugins/walletConnectToDapps/v1/components/modals/callRequest/CallRequestCommon'
import { useCallback, useMemo } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectPortfolioAccountMetadata } from 'state/slices/portfolioSlice/selectors'
import { useAppSelector } from 'state/store'

export const useApprovalHandler = (wcAccountId: AccountId | undefined) => {
  const wallet = useWallet().state.wallet
  const accountMetadataById = useAppSelector(selectPortfolioAccountMetadata)

  const accountMetadata = useMemo(() => {
    if (!wcAccountId) return
    return accountMetadataById[wcAccountId]
  }, [accountMetadataById, wcAccountId])

  const chainAdapter = useMemo(() => {
    if (!wcAccountId) return
    const { chainId } = fromAccountId(wcAccountId)
    const maybeChainAdapter = getChainAdapterManager().get(chainId)
    if (!maybeChainAdapter) return
    return maybeChainAdapter as unknown as EvmBaseAdapter<EvmChainId>
  }, [wcAccountId])

  const signMessage = useCallback(
    (message: ethers.utils.BytesLike) => {
      if (!accountMetadata || !chainAdapter || !wallet || !message) return
      const addressNList = toAddressNList(accountMetadata.bip44Params)
      const messageToSign = { addressNList, message }
      return chainAdapter.signMessage({ messageToSign, wallet })
    },
    [accountMetadata, chainAdapter, wallet],
  )

  const eth_sign = useCallback(
    (request: WalletConnectEthSignCallRequest) => signMessage(request.params[1]),
    [signMessage],
  )

  const personal_sign = useCallback(
    (request: WalletConnectPersonalSignCallRequest) => signMessage(request.params[0]),
    [signMessage],
  )

  const eth_signTypedData = useCallback(
    (request: WalletConnectEthSignTypedDataCallRequest) => {
      if (!accountMetadata || !chainAdapter || !wallet) return

      const typedData = JSON.parse(request.params[1])
      if (!typedData) return

      const addressNList = toAddressNList(accountMetadata.bip44Params)
      const typedDataToSign = { addressNList, typedData }

      return chainAdapter.signTypedData({ typedDataToSign, wallet })
    },
    [accountMetadata, chainAdapter, wallet],
  )

  const eth_sendTransaction = useCallback(
    async (request: WalletConnectEthSendTransactionCallRequest, approveData: ConfirmData) => {
      if (!accountMetadata || !chainAdapter || !wallet || !wcAccountId) return

      const tx = request.params[0]
      const maybeAdvancedParamsNonce = approveData.nonce
        ? convertNumberToHex(approveData.nonce)
        : null

      const didUserChangeNonce = maybeAdvancedParamsNonce && maybeAdvancedParamsNonce !== tx.nonce
      const fees = await getFeesForTx(tx, chainAdapter, wcAccountId)
      const gasData = getGasData(approveData, fees)

      const { accountNumber } = accountMetadata.bip44Params

      const { txToSign: txToSignWithPossibleWrongNonce } = await chainAdapter.buildCustomTx({
        wallet,
        accountNumber,
        to: tx.to,
        data: tx.data,
        value: tx.value ?? '0',
        // https://docs.walletconnect.com/1.0/json-rpc-api-methods/ethereum#eth_sendtransaction
        gasLimit: approveData.gasLimit ?? tx.gas ?? '90000',
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
        console.error(error)
      }
    },
    [accountMetadata, chainAdapter, wallet, wcAccountId],
  )

  const eth_signTransaction = useCallback(
    async (request: WalletConnectEthSignTransactionCallRequest, approveData: ConfirmData) => {
      if (!accountMetadata || !chainAdapter || !wallet || !wcAccountId) return

      const tx = request.params[0]

      const nonce = approveData.nonce ? convertNumberToHex(approveData.nonce) : tx.nonce
      if (!nonce) return

      const gasLimit =
        (approveData.gasLimit ? convertNumberToHex(approveData.gasLimit) : tx.gas) ??
        convertNumberToHex(90000) // https://docs.walletconnect.com/1.0/json-rpc-api-methods/ethereum#eth_sendtransaction

      const fees = await getFeesForTx(tx, chainAdapter, wcAccountId)
      const gasData = getGasData(approveData, fees)

      return await chainAdapter.signTransaction({
        txToSign: {
          addressNList: toAddressNList(accountMetadata.bip44Params),
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
    [accountMetadata, chainAdapter, wallet, wcAccountId],
  )

  return { eth_signTransaction, eth_sendTransaction, eth_signTypedData, personal_sign, eth_sign }
}
