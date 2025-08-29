import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, toAccountId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import { RFOX_ABI } from '@shapeshiftoss/contracts'
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { encodeFunctionData } from 'viem'

import type { UnstakeInputValues } from '../types'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import type { EvmFees } from '@/hooks/queries/useEvmFees'
import { useEvmFees } from '@/hooks/queries/useEvmFees'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from '@/lib/math'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
} from '@/lib/utils/evm'
import { getStakingContract, selectStakingBalance } from '@/pages/RFOX/helpers'
import { useCooldownPeriodQuery } from '@/pages/RFOX/hooks/useCooldownPeriodQuery'
import { useStakingBalanceOfQuery } from '@/pages/RFOX/hooks/useStakingBalanceOfQuery'
import { useStakingInfoQuery } from '@/pages/RFOX/hooks/useStakingInfoQuery'
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
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { useAppDispatch, useAppSelector } from '@/state/store'

type UseRfoxUnstakeProps = {
  stakingAssetId: AssetId
  stakingAssetAccountId: AccountId | undefined
  amountCryptoBaseUnit: string
  methods: UseFormReturn<UnstakeInputValues> | undefined
  setUnstakeTxid: ((txId: string) => void) | undefined
  unstakeTxid: string | undefined
}
type UseRfoxUnstakeReturn = {
  unstakeFeesQuery: UseQueryResult<EvmFees, Error>
  unstakeMutation: UseMutationResult<string | undefined, Error, void, unknown>
  isUnstakeTxPending: boolean
  isGetUnstakeFeesEnabled: boolean
  userStakingBalanceOfQuery: UseQueryResult<string, Error>
  newContractBalanceOfQuery: UseQueryResult<string, Error>
  newShareOfPoolPercentage: string
}

export const useRfoxUnstake = ({
  methods,
  stakingAssetId,
  stakingAssetAccountId,
  amountCryptoBaseUnit,
  setUnstakeTxid,
  unstakeTxid,
}: UseRfoxUnstakeProps): UseRfoxUnstakeReturn => {
  const dispatch = useAppDispatch()
  const wallet = useWallet().state.wallet
  const errors = useMemo(() => methods?.formState.errors, [methods?.formState.errors])

  const { isDrawerOpen, openActionCenter } = useActionCenterContext()

  const toast = useNotificationToast({
    duration: isDrawerOpen ? 5000 : null,
  })

  const { data: cooldownPeriodData } = useCooldownPeriodQuery(stakingAssetId)

  const stakingAssetAccountNumberFilter = useMemo(() => {
    return {
      assetId: stakingAssetId,
      accountId: stakingAssetAccountId,
    }
  }, [stakingAssetAccountId, stakingAssetId])
  const stakingAssetAccountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, stakingAssetAccountNumberFilter),
  )
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const stakingAssetFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(stakingAssetId).chainId),
  )

  const stakingAssetAccountAddress = useMemo(
    () => (stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : undefined),
    [stakingAssetAccountId],
  )

  const hasEnteredValue = useMemo(
    () => bnOrZero(amountCryptoBaseUnit).gt(0),
    [amountCryptoBaseUnit],
  )

  const amountCryptoPrecision = useMemo(
    () => (stakingAsset ? fromBaseUnit(amountCryptoBaseUnit, stakingAsset.precision) : undefined),
    [amountCryptoBaseUnit, stakingAsset],
  )

  const adapter = useMemo(
    () =>
      stakingAssetFeeAsset
        ? assertGetEvmChainAdapter(fromAssetId(stakingAssetFeeAsset.assetId).chainId)
        : undefined,
    [stakingAssetFeeAsset],
  )

  const callData = useMemo(() => {
    if (!hasEnteredValue) return

    return encodeFunctionData({
      abi: RFOX_ABI,
      functionName: 'unstake',
      args: [BigInt(toBaseUnit(amountCryptoPrecision, stakingAsset?.precision ?? 0))],
    })
  }, [amountCryptoPrecision, hasEnteredValue, stakingAsset?.precision])

  const unstakeFeesQueryInput = useMemo(
    () => ({
      to: getStakingContract(stakingAssetId),
      from: stakingAssetAccountAddress,
      accountNumber: stakingAssetAccountNumber,
      data: callData,
      value: '0',
      chainId: fromAssetId(stakingAssetId).chainId,
    }),
    [callData, stakingAssetAccountAddress, stakingAssetAccountNumber, stakingAssetId],
  )

  const unstakeMutation = useMutation({
    mutationFn: async () => {
      if (
        !wallet ||
        stakingAssetAccountNumber === undefined ||
        !stakingAssetAccountId ||
        !stakingAssetAccountAddress ||
        !stakingAsset ||
        !callData ||
        !adapter ||
        !amountCryptoPrecision
      )
        return

      const buildCustomTxInput = await createBuildCustomTxInput({
        accountNumber: stakingAssetAccountNumber,
        from: stakingAssetAccountAddress,
        adapter,
        data: callData,
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
          type: ActionType.Withdraw,
          status: ActionStatus.Pending,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          transactionMetadata: {
            displayType: GenericTransactionDisplayType.RFOX,
            queryId: GenericTransactionQueryId.RFOX,
            amountCryptoPrecision,
            cooldownPeriod: cooldownPeriodData?.cooldownPeriod,
            cooldownPeriodSeconds: cooldownPeriodData?.cooldownPeriodSeconds,
            message: 'RFOX.unstakePending',
            txHash: txId,
            chainId: stakingAsset.chainId,
            accountId: stakingAssetAccountId,
            assetId: stakingAssetId,
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
      if (!txId || !setUnstakeTxid) return

      setUnstakeTxid(txId)
    },
  })

  const serializedUnstakeTxIndex = useMemo(() => {
    if (!(unstakeTxid && stakingAssetAccountAddress && stakingAssetAccountId)) return

    return serializeTxIndex(stakingAssetAccountId, unstakeTxid, stakingAssetAccountAddress)
  }, [stakingAssetAccountAddress, stakingAssetAccountId, unstakeTxid])

  const unstakeTx = useAppSelector(state =>
    serializedUnstakeTxIndex ? selectTxById(state, serializedUnstakeTxIndex) : undefined,
  )

  const isUnstakeTxPending = useMemo(
    () => unstakeMutation.isPending || (unstakeMutation.isSuccess && !unstakeTx),
    [unstakeMutation.isPending, unstakeMutation.isSuccess, unstakeTx],
  )

  const isGetUnstakeFeesEnabled = useMemo(
    () => Boolean(hasEnteredValue && unstakeMutation.isIdle && !Boolean(errors?.amountFieldInput)),
    [errors?.amountFieldInput, hasEnteredValue, unstakeMutation.isIdle],
  )

  const unstakeFeesQuery = useEvmFees({
    ...unstakeFeesQueryInput,
    enabled: isGetUnstakeFeesEnabled,
    staleTime: 30_000,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: 15_000,
  })

  const userStakingBalanceOfQuery = useStakingInfoQuery({
    accountId: stakingAssetAccountId,
    stakingAssetId,
    select: selectStakingBalance,
  })
  const { data: userStakingBalanceOfCryptoBaseUnit } = userStakingBalanceOfQuery

  const newContractBalanceOfQuery = useStakingBalanceOfQuery({
    accountId: toAccountId({
      account: getStakingContract(stakingAssetId),
      chainId: fromAssetId(stakingAssetId).chainId,
    }),
    stakingAssetId,
    select: data => data.toString(),
  })
  const { data: newContractBalanceOfCryptoBaseUnit } = newContractBalanceOfQuery

  const newShareOfPoolPercentage = useMemo(
    () =>
      bnOrZero(userStakingBalanceOfCryptoBaseUnit)
        .minus(amountCryptoBaseUnit)
        .div(newContractBalanceOfCryptoBaseUnit ?? 0)
        .toFixed(4),
    [amountCryptoBaseUnit, newContractBalanceOfCryptoBaseUnit, userStakingBalanceOfCryptoBaseUnit],
  )

  return {
    newShareOfPoolPercentage,
    isGetUnstakeFeesEnabled,
    unstakeMutation,
    unstakeFeesQuery,
    newContractBalanceOfQuery,
    userStakingBalanceOfQuery,
    isUnstakeTxPending,
  }
}
