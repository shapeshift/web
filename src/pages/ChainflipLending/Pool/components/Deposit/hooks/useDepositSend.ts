import { CHAIN_NAMESPACE, fromAccountId, fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import { assertGetViemClient } from '@shapeshiftoss/contracts'
import { useEffect, useMemo, useRef } from 'react'
import type { Hash } from 'viem'
import { encodeFunctionData, erc20Abi } from 'viem'

import { DepositMachineCtx } from '../DepositMachineContext'

import { useWallet } from '@/hooks/useWallet/useWallet'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
} from '@/lib/utils/evm'
import { assertGetSolanaChainAdapter } from '@/lib/utils/solana'
import { assertGetUtxoChainAdapter } from '@/lib/utils/utxo'
import { useChainflipLendingAccount } from '@/pages/ChainflipLending/ChainflipLendingAccountContext'
import {
  selectAccountIdsByAccountNumberAndChainId,
  selectPortfolioAccountMetadataByAccountId,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useDepositSend = () => {
  const actorRef = DepositMachineCtx.useActorRef()
  const stateValue = DepositMachineCtx.useSelector(s => s.value)
  const { depositAddress, depositAmountCryptoBaseUnit, assetId } = DepositMachineCtx.useSelector(
    s => ({
      depositAddress: s.context.depositAddress,
      depositAmountCryptoBaseUnit: s.context.depositAmountCryptoBaseUnit,
      assetId: s.context.assetId,
    }),
  )
  const isNativeWallet = DepositMachineCtx.useSelector(s => s.context.isNativeWallet)
  const stepConfirmed = DepositMachineCtx.useSelector(s => s.context.stepConfirmed)
  const wallet = useWallet().state.wallet
  const { accountNumber } = useChainflipLendingAccount()
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )

  const depositChainId = useMemo(() => fromAssetId(assetId).chainId, [assetId])

  const depositChainAccountId = useMemo(() => {
    const byChainId = accountIdsByAccountNumberAndChainId[accountNumber]
    return byChainId?.[depositChainId]?.[0]
  }, [accountIdsByAccountNumberAndChainId, accountNumber, depositChainId])

  const accountMetadataFilter = useMemo(
    () => ({ accountId: depositChainAccountId ?? '' }),
    [depositChainAccountId],
  )
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, accountMetadataFilter),
  )
  const executingRef = useRef(false)

  useEffect(() => {
    if (stateValue !== 'sending_deposit' || executingRef.current) return
    if (isNativeWallet && !stepConfirmed) return
    executingRef.current = true

    const execute = async () => {
      try {
        if (!wallet) throw new Error('Wallet not connected')
        if (!depositChainAccountId) throw new Error('No account found for deposit chain')
        if (!depositAddress) throw new Error('Deposit address not set')

        const { account: from } = fromAccountId(depositChainAccountId)
        const { assetNamespace, assetReference, chainId } = fromAssetId(assetId)
        const { chainNamespace } = fromChainId(chainId)

        const txHash = await (async () => {
          switch (chainNamespace) {
            case CHAIN_NAMESPACE.Evm: {
              const adapter = assertGetEvmChainAdapter(chainId)
              const isToken = assetNamespace === 'erc20'

              if (isToken) {
                const data = encodeFunctionData({
                  abi: erc20Abi,
                  functionName: 'transfer',
                  args: [depositAddress as `0x${string}`, BigInt(depositAmountCryptoBaseUnit)],
                })

                const buildCustomTxInput = await createBuildCustomTxInput({
                  accountNumber,
                  from,
                  adapter,
                  data,
                  to: assetReference,
                  value: '0',
                  wallet,
                })
                return buildAndBroadcast({
                  adapter,
                  buildCustomTxInput,
                  receiverAddress: CONTRACT_INTERACTION,
                })
              }

              const buildCustomTxInput = await createBuildCustomTxInput({
                accountNumber,
                from,
                adapter,
                data: '0x',
                to: depositAddress,
                value: depositAmountCryptoBaseUnit,
                wallet,
              })
              return buildAndBroadcast({
                adapter,
                buildCustomTxInput,
                receiverAddress: depositAddress,
              })
            }

            case CHAIN_NAMESPACE.Utxo: {
              if (!accountMetadata?.accountType) {
                throw new Error('Account type not found for UTXO account')
              }

              const adapter = assertGetUtxoChainAdapter(chainId)
              const feeData = await adapter.getFeeData({
                to: depositAddress,
                value: depositAmountCryptoBaseUnit,
                chainSpecific: { from, pubkey: from },
                sendMax: false,
              })

              const { txToSign } = await adapter.buildSendTransaction({
                to: depositAddress,
                value: depositAmountCryptoBaseUnit,
                wallet,
                accountNumber,
                chainSpecific: {
                  from,
                  satoshiPerByte: feeData.fast.chainSpecific.satoshiPerByte,
                  accountType: accountMetadata.accountType,
                },
              })

              const signedTx = await adapter.signTransaction({ txToSign, wallet })
              return adapter.broadcastTransaction({ hex: signedTx })
            }

            case CHAIN_NAMESPACE.Solana: {
              const adapter = assertGetSolanaChainAdapter(chainId)

              const { txToSign } = await adapter.buildSendTransaction({
                to: depositAddress,
                value: depositAmountCryptoBaseUnit,
                wallet,
                accountNumber,
                chainSpecific: {},
              })

              const signedTx = await adapter.signTransaction({ txToSign, wallet })
              return adapter.broadcastTransaction({
                senderAddress: from,
                receiverAddress: depositAddress,
                hex: signedTx,
              })
            }

            default:
              throw new Error(`Unsupported chain namespace: ${chainNamespace}`)
          }
        })()

        actorRef.send({ type: 'SEND_BROADCASTED', txHash })

        if (chainNamespace === CHAIN_NAMESPACE.Evm) {
          const publicClient = assertGetViemClient(chainId)
          await publicClient.waitForTransactionReceipt({ hash: txHash as Hash })
        }

        actorRef.send({ type: 'SEND_SUCCESS' })
      } catch (e) {
        console.error('[ChainflipLending] Deposit send failed', e)
        const message = e instanceof Error ? e.message : 'Deposit send failed'
        actorRef.send({ type: 'SEND_ERROR', error: message })
      } finally {
        executingRef.current = false
      }
    }

    execute()
  }, [
    stateValue,
    actorRef,
    wallet,
    depositChainAccountId,
    accountNumber,
    accountMetadata,
    depositAddress,
    depositAmountCryptoBaseUnit,
    assetId,
    isNativeWallet,
    stepConfirmed,
  ])
}
