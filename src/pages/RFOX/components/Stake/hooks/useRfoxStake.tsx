import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import { RFOX_ABI } from '@shapeshiftoss/contracts'
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { encodeFunctionData, erc20Abi } from 'viem'

import type { StakeInputValues } from '../types'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import type { EvmFees } from '@/hooks/queries/useEvmFees'
import { useEvmFees } from '@/hooks/queries/useEvmFees'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
  isGetFeesWithWalletEIP1559SupportArgs,
} from '@/lib/utils/evm'
import { getStakingContract } from '@/pages/RFOX/helpers'
import { reactQueries } from '@/react-queries'
import { useAllowance } from '@/react-queries/hooks/useAllowance'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
  GenericTransactionQueryId,
} from '@/state/slices/actionSlice/types'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectFeeAssetByChainId,
  selectTxById,
} from '@/state/slices/selectors'
import type { Tx } from '@/state/slices/txHistorySlice/txHistorySlice'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { useAppDispatch, useAppSelector } from '@/state/store'

type UseRfoxStakeProps = {
  runeAddress: string | undefined
  stakingAssetId: AssetId
  stakingAssetAccountId: AccountId | undefined
  amountCryptoBaseUnit: string
  methods: UseFormReturn<StakeInputValues> | undefined
  hasEnoughBalance: boolean
  setStakeTxid: ((txId: string) => void) | undefined
}
type UseRfoxStakeReturn = {
  allowanceQuery: UseQueryResult<string | undefined, Error>
  approvalFeesQuery: UseQueryResult<EvmFees, Error>
  stakeFeesQuery: UseQueryResult<EvmFees, Error>
  approvalMutation: UseMutationResult<string, Error, void | undefined, unknown>
  stakeMutation: UseMutationResult<string | undefined, Error, void, unknown>
  approvalTxHash: string | undefined
  isGetApprovalFeesEnabled: boolean
  isApprovalRequired: boolean
  isGetStakeFeesEnabled: boolean
  approvalTx: Tx | undefined
}

export const useRfoxStake = ({
  amountCryptoBaseUnit,
  runeAddress,
  stakingAssetId,
  stakingAssetAccountId,
  methods,
  hasEnoughBalance,
  setStakeTxid,
}: UseRfoxStakeProps): UseRfoxStakeReturn => {
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
  const dispatch = useAppDispatch()
  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })
  const [approvalTxHash, setApprovalTxHash] = useState<string>()

  const wallet = useWallet().state.wallet
  const translate = useTranslate()
  const errors = useMemo(() => methods?.formState.errors, [methods?.formState.errors])

  const stakingAssetAccountNumberFilter = useMemo(() => {
    return {
      assetId: stakingAssetId,
      accountId: stakingAssetAccountId,
    }
  }, [stakingAssetId, stakingAssetAccountId])

  const stakingAssetAccountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, stakingAssetAccountNumberFilter),
  )
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const stakingAssetFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(stakingAssetId).chainId),
  )

  const adapter = useMemo(
    () =>
      stakingAssetFeeAsset
        ? assertGetEvmChainAdapter(fromAssetId(stakingAssetFeeAsset.assetId).chainId)
        : undefined,
    [stakingAssetFeeAsset],
  )

  const stakingAssetAccountAddress = useMemo(
    () => (stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : undefined),
    [stakingAssetAccountId],
  )

  const amountCryptoPrecision = useMemo(
    () => (stakingAsset ? fromBaseUnit(amountCryptoBaseUnit, stakingAsset.precision) : undefined),
    [amountCryptoBaseUnit, stakingAsset],
  )

  const isValidStakingAmount = useMemo(
    () => bnOrZero(amountCryptoBaseUnit).gt(0),
    [amountCryptoBaseUnit],
  )

  const stakeCallData = useMemo(() => {
    if (!(isValidStakingAmount && runeAddress && stakingAsset)) return

    return encodeFunctionData({
      abi: RFOX_ABI,
      functionName: 'stake',
      args: [BigInt(amountCryptoBaseUnit), runeAddress],
    })
  }, [amountCryptoBaseUnit, isValidStakingAmount, runeAddress, stakingAsset])

  const approvalCallData = useMemo(() => {
    if (!stakingAsset) return

    return encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [getStakingContract(stakingAssetId), BigInt(amountCryptoBaseUnit)],
    })
  }, [amountCryptoBaseUnit, stakingAssetId, stakingAsset])

  const allowanceQuery = useAllowance({
    assetId: stakingAsset?.assetId,
    spender: getStakingContract(stakingAssetId),
    from: stakingAssetAccountAddress,
    isRefetchEnabled: true,
  })

  const allowanceCryptoPrecision = useMemo(() => {
    const allowanceDataCryptoBaseUnit = allowanceQuery.data
    if (!allowanceDataCryptoBaseUnit) return
    if (!stakingAssetFeeAsset) return

    return fromBaseUnit(allowanceDataCryptoBaseUnit, stakingAssetFeeAsset.precision)
  }, [allowanceQuery.data, stakingAssetFeeAsset])

  const isApprovalRequired = useMemo(
    () =>
      Boolean(
        amountCryptoPrecision &&
          allowanceQuery.isSuccess &&
          bnOrZero(allowanceCryptoPrecision).lt(amountCryptoPrecision),
      ),
    [allowanceCryptoPrecision, allowanceQuery.isSuccess, amountCryptoPrecision],
  )

  const approvalFeesQueryInput = useMemo(
    () => ({
      value: '0',
      from: stakingAssetAccountAddress,
      accountNumber: stakingAssetAccountNumber,
      to: fromAssetId(stakingAssetId).assetReference,
      data: approvalCallData,
      chainId: fromAssetId(stakingAssetId).chainId,
    }),
    [approvalCallData, stakingAssetAccountAddress, stakingAssetAccountNumber, stakingAssetId],
  )

  const getApprovalFeesWithWalletInput = useMemo(
    () => ({ ...approvalFeesQueryInput, adapter, wallet }),
    [adapter, approvalFeesQueryInput, wallet],
  )

  const isGetApprovalFeesEnabled = useMemo(
    () =>
      Boolean(
        isGetFeesWithWalletEIP1559SupportArgs(getApprovalFeesWithWalletInput) &&
          hasEnoughBalance &&
          isApprovalRequired &&
          !Boolean(errors?.manualRuneAddress),
      ),
    [
      getApprovalFeesWithWalletInput,
      hasEnoughBalance,
      isApprovalRequired,
      errors?.manualRuneAddress,
    ],
  )
  const approvalFeesQuery = useEvmFees({
    ...approvalFeesQueryInput,
    enabled: isGetApprovalFeesEnabled,
    staleTime: 30_000,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: 15_000,
  })

  const stakeMutation = useMutation({
    mutationFn: async () => {
      if (
        !wallet ||
        stakingAssetAccountNumber === undefined ||
        !stakingAssetAccountAddress ||
        !stakingAsset ||
        !adapter ||
        !stakeCallData ||
        !setStakeTxid ||
        !stakingAssetAccountId ||
        !amountCryptoPrecision
      )
        return

      const buildCustomTxInput = await createBuildCustomTxInput({
        accountNumber: stakingAssetAccountNumber,
        from: stakingAssetAccountAddress,
        adapter,
        data: stakeCallData,
        value: '0',
        to: getStakingContract(stakingAssetId),
        wallet,
      })

      const txId = await buildAndBroadcast({
        adapter,
        buildCustomTxInput,
        receiverAddress: CONTRACT_INTERACTION, // no receiver for this contract call
      })

      dispatch(
        actionSlice.actions.upsertAction({
          id: txId,
          type: ActionType.Deposit,
          status: ActionStatus.Pending,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          transactionMetadata: {
            displayType: GenericTransactionDisplayType.RFOX,
            queryId: GenericTransactionQueryId.RFOX,
            txHash: txId,
            chainId: stakingAsset.chainId,
            accountId: stakingAssetAccountId,
            assetId: stakingAssetId,
            amountCryptoPrecision,
            message: 'RFOX.stakePending',
          },
        }),
      )

      toast({
        id: txId,
        duration: isDrawerOpen ? 5000 : null,
        status: 'success',
        render: ({ onClose, ...props }) => {
          const handleClick = () => {
            onClose()
            openActionCenter()
          }

          return (
            <GenericTransactionNotification
              // eslint-disable-next-line react-memo/require-usememo
              handleClick={handleClick}
              actionId={txId}
              onClose={onClose}
              {...props}
            />
          )
        },
      })

      return txId
    },
    onSuccess: (txId: string | undefined) => {
      if (!txId || !setStakeTxid) return

      setStakeTxid(txId)
    },
  })

  const stakeFeesQueryInput = useMemo(
    () => ({
      to: getStakingContract(stakingAssetId),
      accountNumber: stakingAssetAccountNumber,
      from: stakingAssetAccountAddress,
      data: stakeCallData,
      value: '0',
      chainId: fromAssetId(stakingAssetId).chainId,
    }),
    [stakeCallData, stakingAssetAccountAddress, stakingAssetAccountNumber, stakingAssetId],
  )

  const isGetStakeFeesEnabled = useMemo(
    () =>
      Boolean(
        stakeMutation.isIdle &&
          hasEnoughBalance &&
          isValidStakingAmount &&
          runeAddress &&
          !Boolean(errors?.amountFieldInput || errors?.manualRuneAddress) &&
          allowanceQuery.isSuccess &&
          !isApprovalRequired,
      ),
    [
      allowanceQuery.isSuccess,
      errors?.amountFieldInput,
      errors?.manualRuneAddress,
      hasEnoughBalance,
      isApprovalRequired,
      isValidStakingAmount,
      runeAddress,
      stakeMutation.isIdle,
    ],
  )

  const stakeFeesQuery = useEvmFees({
    ...stakeFeesQueryInput,
    enabled: isGetStakeFeesEnabled,
    staleTime: 30_000,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: 15_000,
  })

  const approvalMutation = useMutation({
    ...reactQueries.mutations.approve({
      assetId: stakingAssetId,
      spender: getStakingContract(stakingAssetId),
      amountCryptoBaseUnit,
      wallet: wallet ?? undefined,
      from: stakingAssetAccountAddress,
      accountNumber: stakingAssetAccountNumber,
    }),
    onSuccess: (txId: string) => {
      setApprovalTxHash(txId)

      if (!stakingAsset || !stakingAssetAccountId) return

      const amountCryptoPrecision = fromBaseUnit(amountCryptoBaseUnit, stakingAsset.precision)

      dispatch(
        actionSlice.actions.upsertAction({
          id: txId,
          type: ActionType.Approve,
          status: ActionStatus.Pending,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          transactionMetadata: {
            displayType: GenericTransactionDisplayType.Approve,
            txHash: txId,
            chainId: stakingAsset.chainId,
            accountId: stakingAssetAccountId,
            amountCryptoPrecision,
            assetId: stakingAssetId,
            contractName: 'RFOX',
            message: translate('actionCenter.approve.approvalTxPending', {
              contractName: 'RFOX',
              amountCryptoPrecision,
              symbol: stakingAsset.symbol,
            }),
          },
        }),
      )

      toast({
        id: txId,
        duration: isDrawerOpen ? 5000 : null,
        status: 'success',
        render: ({ onClose, ...props }) => {
          const handleClick = () => {
            onClose()
            openActionCenter()
          }

          return (
            <GenericTransactionNotification
              // eslint-disable-next-line react-memo/require-usememo
              handleClick={handleClick}
              actionId={txId}
              onClose={onClose}
              {...props}
            />
          )
        },
      })
    },
  })

  const serializedApprovalTxIndex = useMemo(() => {
    if (!(approvalTxHash && stakingAssetAccountAddress && stakingAssetAccountId)) return undefined

    return serializeTxIndex(stakingAssetAccountId, approvalTxHash, stakingAssetAccountAddress)
  }, [approvalTxHash, stakingAssetAccountAddress, stakingAssetAccountId])

  const approvalTx = useAppSelector(state =>
    serializedApprovalTxIndex ? selectTxById(state, serializedApprovalTxIndex) : undefined,
  )

  return {
    allowanceQuery,
    approvalFeesQuery,
    isGetApprovalFeesEnabled,
    isApprovalRequired,
    stakeFeesQuery,
    isGetStakeFeesEnabled,
    approvalMutation,
    approvalTxHash,
    approvalTx,
    stakeMutation,
  }
}
