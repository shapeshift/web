import { tcyAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import { useMutation } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { TCYStakeRoute } from '../../types'
import type { StakeFormValues } from './Stake'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { ReusableConfirm } from '@/components/ReusableConfirm/ReusableConfirm'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { toBaseUnit } from '@/lib/math'
import { THOR_PRECISION } from '@/lib/utils/thorchain/constants'
import { useSendThorTx } from '@/lib/utils/thorchain/hooks/useSendThorTx'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
  GenericTransactionQueryId,
} from '@/state/slices/actionSlice/types'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { selectMarketDataByFilter } from '@/state/slices/marketDataSlice/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const StakeConfirm: React.FC = () => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { watch } = useFormContext<StakeFormValues>()
  const amountCryptoPrecision = watch('amountCryptoPrecision')
  const accountId = watch('accountId')
  const tcyMarketData = useAppSelector(state =>
    selectMarketDataByFilter(state, { assetId: tcyAssetId }),
  )
  const tcyAsset = useAppSelector(state => selectAssetById(state, tcyAssetId))
  const fiatAmount = useMemo(
    () =>
      bnOrZero(amountCryptoPrecision)
        .times(bnOrZero(tcyMarketData?.price))
        .toFixed(2),
    [amountCryptoPrecision, tcyMarketData],
  )

  const { isDrawerOpen, openActionCenter } = useActionCenterContext()

  const toast = useNotificationToast({
    duration: isDrawerOpen ? 5000 : null,
  })

  const amountCryptoBaseUnit = useMemo(
    () => toBaseUnit(amountCryptoPrecision, THOR_PRECISION),
    [amountCryptoPrecision],
  )

  const {
    executeTransaction,
    estimatedFeesData,
    isEstimatedFeesDataLoading,
    isEstimatedFeesDataError,
  } = useSendThorTx({
    accountId,
    action: 'stakeTcy',
    amountCryptoBaseUnit,
    assetId: tcyAssetId,
    memo: 'tcy+',
    fromAddress: null,
  })

  const { mutateAsync: handleStake, isPending: isStakeMutationPending } = useMutation({
    mutationFn: async () => {
      const txid = await executeTransaction()
      if (!txid) throw new Error('Failed to broadcast transaction')

      dispatch(
        actionSlice.actions.upsertAction({
          id: txid,
          type: ActionType.Deposit,
          transactionMetadata: {
            displayType: GenericTransactionDisplayType.TCY,
            queryId: GenericTransactionQueryId.TCY,
            txHash: txid,
            chainId: thorchainChainId,
            accountId,
            assetId: tcyAssetId,
            amountCryptoPrecision,
            message: 'actionCenter.tcy.stakePending',
            thorMemo: 'tcy+',
          },
          status: ActionStatus.Pending,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      )

      toast({
        id: txid,
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
              actionId={txid}
              onClose={onClose}
              {...props}
            />
          )
        },
      })

      return txid
    },
  })

  const handleConfirm = useCallback(async () => {
    await handleStake()
    navigate(TCYStakeRoute.Input)
  }, [handleStake, navigate])

  const handleCancel = useCallback(() => {
    navigate(TCYStakeRoute.Input)
  }, [navigate])

  const headerLeftComponent = useMemo(
    () => <DialogBackButton onClick={handleCancel} />,
    [handleCancel],
  )

  if (!tcyAsset) return null

  return (
    <ReusableConfirm
      assetId={tcyAssetId}
      headerText={translate('TCY.stakeConfirm.confirmTitle')}
      cryptoAmount={amountCryptoPrecision}
      cryptoSymbol={tcyAsset.symbol}
      fiatAmount={fiatAmount}
      feeAmountFiat={estimatedFeesData?.txFeeFiat}
      confirmText={translate('TCY.stakeConfirm.confirmAndStake')}
      onConfirm={handleConfirm}
      headerLeftComponent={headerLeftComponent}
      isDisabled={isStakeMutationPending || isEstimatedFeesDataLoading || isEstimatedFeesDataError}
      isLoading={isStakeMutationPending || isEstimatedFeesDataLoading}
    />
  )
}
