import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { isTrezor } from '@shapeshiftoss/hdwallet-trezor'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { UseQueryResult } from '@tanstack/react-query'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { encodeFunctionData, erc20Abi, getAddress } from 'viem'

import type { RfoxBridgeQuote } from '../types'
import { useRfoxBridge } from './useRfoxBridge'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import type { EvmFees } from '@/hooks/queries/useEvmFees'
import { useEvmFees } from '@/hooks/queries/useEvmFees'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import type {
  GetFeesWithWalletEip1559SupportArgs,
  MaybeGetFeesWithWalletEip1559Args,
} from '@/lib/utils/evm'
import { assertGetEvmChainAdapter, isGetFeesWithWalletEIP1559SupportArgs } from '@/lib/utils/evm'
import { reactQueries } from '@/react-queries'
import { useAllowance } from '@/react-queries/hooks/useAllowance'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
import { selectAssetById, selectTxById } from '@/state/slices/selectors'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { useAppDispatch, useAppSelector } from '@/state/store'

type UseRfoxBridgeApprovalProps = { confirmedQuote: RfoxBridgeQuote }
type UseRfoxBridgeApprovalReturn = {
  isApprovalRequired: boolean
  allowanceQuery: UseQueryResult<string | undefined, Error>
  isGetApprovalFeesEnabled: boolean
  approvalFeesQuery: UseQueryResult<EvmFees, Error>
  isApprovalTxPending: boolean
  isApprovalTxSuccess: boolean
  handleApprove: () => Promise<string>
  isTransitioning: boolean
}

export const useRfoxBridgeApproval = ({
  confirmedQuote,
}: UseRfoxBridgeApprovalProps): UseRfoxBridgeApprovalReturn => {
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })
  const wallet = useWallet().state.wallet
  const [approvalTxHash, setApprovalTxHash] = useState<string>()
  const { sellAssetAccountNumber, feeAsset, allowanceContract } = useRfoxBridge({ confirmedQuote })

  const adapter = useMemo(
    () => (feeAsset ? assertGetEvmChainAdapter(fromAssetId(feeAsset.assetId).chainId) : undefined),
    [feeAsset],
  )

  const sellAsset = useAppSelector(state => selectAssetById(state, confirmedQuote.sellAssetId))

  const allowanceQuery = useAllowance({
    assetId: confirmedQuote.sellAssetId,
    spender: allowanceContract,
    from: fromAccountId(confirmedQuote.sellAssetAccountId).account,
    isRefetchEnabled: true,
  })

  const isApprovalRequired = useMemo(
    () => bnOrZero(allowanceQuery.data).lt(confirmedQuote.bridgeAmountCryptoBaseUnit),
    [allowanceQuery.data, confirmedQuote.bridgeAmountCryptoBaseUnit],
  )

  const approvalCallData = useMemo(() => {
    if (!allowanceContract) return

    return encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [getAddress(allowanceContract), BigInt(confirmedQuote.bridgeAmountCryptoBaseUnit)],
    })
  }, [allowanceContract, confirmedQuote.bridgeAmountCryptoBaseUnit])

  const approvalMutation = useMutation({
    ...reactQueries.mutations.approve({
      assetId: confirmedQuote.sellAssetId,
      spender: allowanceContract,
      amountCryptoBaseUnit: confirmedQuote.bridgeAmountCryptoBaseUnit,
      wallet: wallet ?? undefined,
      from: fromAccountId(confirmedQuote.sellAssetAccountId).account,
      accountNumber: sellAssetAccountNumber,
      pubKey:
        wallet && isTrezor(wallet) && confirmedQuote.sellAssetAccountId
          ? fromAccountId(confirmedQuote.sellAssetAccountId).account
          : undefined,
    }),
    onSuccess: (txHash: string) => {
      setApprovalTxHash(txHash)

      if (!sellAsset || !confirmedQuote.sellAssetAccountId) return

      const amountCryptoPrecision = fromBaseUnit(
        confirmedQuote.bridgeAmountCryptoBaseUnit,
        sellAsset.precision,
      )

      dispatch(
        actionSlice.actions.upsertAction({
          id: txHash,
          type: ActionType.Approve,
          status: ActionStatus.Pending,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          transactionMetadata: {
            displayType: GenericTransactionDisplayType.Approve,
            txHash,
            chainId: sellAsset.chainId,
            accountId: confirmedQuote.sellAssetAccountId,
            amountCryptoPrecision,
            assetId: confirmedQuote.sellAssetId,
            contractName: 'Arbitrum Bridge',
            message: 'actionCenter.approve.approvalTxPending',
          },
        }),
      )

      toast({
        id: txHash,
        duration: isDrawerOpen ? 5000 : null,
        status: 'success',
        render: ({ onClose, ...props }) => {
          const handleClick = () => {
            onClose()
            openActionCenter()
          }

          return (
            <GenericTransactionNotification
              handleClick={handleClick}
              actionId={txHash}
              onClose={onClose}
              {...props}
            />
          )
        },
      })
    },
  })

  const serializedApprovalTxIndex = useMemo(() => {
    if (!approvalTxHash) return
    return serializeTxIndex(
      confirmedQuote.sellAssetAccountId,
      approvalTxHash,
      fromAccountId(confirmedQuote.sellAssetAccountId).account,
    )
  }, [approvalTxHash, confirmedQuote.sellAssetAccountId])

  const isGetApprovalFeesEnabled = useCallback(
    (input: MaybeGetFeesWithWalletEip1559Args): input is GetFeesWithWalletEip1559SupportArgs =>
      Boolean(isApprovalRequired && isGetFeesWithWalletEIP1559SupportArgs(input)),
    [isApprovalRequired],
  )

  const approvalFeesQueryInput = useMemo(
    () => ({
      value: '0',
      accountNumber: sellAssetAccountNumber,
      to: fromAssetId(confirmedQuote.sellAssetId).assetReference,
      from: fromAccountId(confirmedQuote.sellAssetAccountId).account,
      data: approvalCallData,
      chainId: fromAssetId(confirmedQuote.sellAssetId).chainId,
    }),
    [
      approvalCallData,
      confirmedQuote.sellAssetAccountId,
      confirmedQuote.sellAssetId,
      sellAssetAccountNumber,
    ],
  )

  const getFeesWithWalletInput = useMemo(
    () => ({ ...approvalFeesQueryInput, adapter, wallet }),
    [adapter, approvalFeesQueryInput, wallet],
  )
  const approvalFeesQuery = useEvmFees({
    ...approvalFeesQueryInput,
    enabled: isGetApprovalFeesEnabled(getFeesWithWalletInput),
    staleTime: 30_000,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: isGetApprovalFeesEnabled(getFeesWithWalletInput) ? 15_000 : false,
  })

  const approvalTx = useAppSelector(gs => selectTxById(gs, serializedApprovalTxIndex ?? ''))

  const isApprovalTxPending = useMemo(
    () =>
      approvalMutation.isPending ||
      (approvalMutation.isSuccess && approvalTx?.status !== TxStatus.Confirmed),
    [approvalMutation.isPending, approvalMutation.isSuccess, approvalTx?.status],
  )

  const isApprovalTxSuccess = useMemo(
    () => approvalTx?.status === TxStatus.Confirmed,
    [approvalTx?.status],
  )

  // The approval Tx may be confirmed, but that's not enough to know we're ready to bridge
  // Allowance then needs to be succesfully refetched - failure to wait for it will result in jumpy states between
  // the time the Tx is confirmed, and the time the allowance is succesfully refetched
  // This allows us to detect such transition state
  const isTransitioning = useMemo(() => {
    // If we don't have a success Tx, we know we're not transitioning
    if (!isApprovalTxSuccess) return false
    // We have a success approval Tx, but approval is still required, meaning we haven't re-rendered with the updated allowance just yet
    if (isApprovalRequired) return true

    // Allowance has been updated, we've finished transitioning
    return false
  }, [isApprovalRequired, isApprovalTxSuccess])

  const handleApprove = useCallback(() => {
    if (!allowanceContract) return Promise.reject('allowanceContract is required')

    return approvalMutation.mutateAsync()
  }, [allowanceContract, approvalMutation])

  useEffect(() => {
    if (!allowanceContract) return
    if (!approvalTx) return
    if (isApprovalTxPending) return

    queryClient.invalidateQueries(
      reactQueries.common.allowanceCryptoBaseUnit(
        confirmedQuote.sellAssetId,
        allowanceContract,
        fromAccountId(confirmedQuote.sellAssetAccountId).account,
      ),
    )
  }, [
    approvalTx,
    isApprovalTxPending,
    queryClient,
    allowanceContract,
    confirmedQuote.sellAssetId,
    confirmedQuote.sellAssetAccountId,
  ])

  return {
    isApprovalRequired,
    allowanceQuery,
    isGetApprovalFeesEnabled: isGetApprovalFeesEnabled(getFeesWithWalletInput),
    approvalFeesQuery,
    isApprovalTxPending,
    isApprovalTxSuccess,
    handleApprove,
    isTransitioning,
  }
}
