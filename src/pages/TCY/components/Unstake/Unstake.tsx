import { useToast } from '@chakra-ui/react'
import { tcyAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import { useQueryClient } from '@tanstack/react-query'
import { lazy, useCallback, useState } from 'react'
import { FormProvider, useForm, useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { MemoryRouter, useLocation } from 'react-router'
import { Route, Switch } from 'wouter'

import type { TCYRouteProps } from '../../types'
import { TCYUnstakeRoute } from '../../types'

import { AnimatedSwitch } from '@/components/AnimatedSwitch'
import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
import { selectAccountIdByAccountNumberAndChainId } from '@/state/slices/portfolioSlice/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'
import { makeSuspenseful } from '@/utils/makeSuspenseful'

const defaultBoxSpinnerStyle = {
  height: '500px',
}

const UnstakeInput = makeSuspenseful(
  lazy(() =>
    import('./UnstakeInput').then(({ UnstakeInput }) => ({
      default: UnstakeInput,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const UnstakeConfirm = makeSuspenseful(
  lazy(() =>
    import('./UnstakeConfirm').then(({ UnstakeConfirm }) => ({
      default: UnstakeConfirm,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const UnstakeStatus = makeSuspenseful(
  lazy(() =>
    import('./UnstakeStatus').then(({ UnstakeStatus }) => ({
      default: UnstakeStatus,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const UnstakeEntries = [TCYUnstakeRoute.Input, TCYUnstakeRoute.Confirm, TCYUnstakeRoute.Status]

export type UnstakeFormValues = {
  amountCryptoPrecision: string
  fiatAmount: string
  accountId: string
}

export const Unstake: React.FC<TCYRouteProps & { activeAccountNumber: number }> = ({
  headerComponent,
  activeAccountNumber,
}) => {
  const accountId = useAppSelector(state => {
    const accountIdsByAccountNumberAndChainId = selectAccountIdByAccountNumberAndChainId(state)
    const accountNumberAccounts = accountIdsByAccountNumberAndChainId[activeAccountNumber]
    return accountNumberAccounts?.[thorchainChainId] ?? ''
  })

  const methods = useForm<UnstakeFormValues>({
    mode: 'onChange',
    defaultValues: {
      amountCryptoPrecision: '',
      fiatAmount: '',
      accountId,
    },
  })

  return (
    <FormProvider {...methods}>
      <MemoryRouter initialEntries={UnstakeEntries} initialIndex={0}>
        <UnstakeRoutes
          headerComponent={headerComponent}
          activeAccountNumber={activeAccountNumber}
        />
      </MemoryRouter>
    </FormProvider>
  )
}

export const UnstakeRoutes: React.FC<TCYRouteProps & { activeAccountNumber: number }> = ({
  headerComponent,
  activeAccountNumber,
}) => {
  const translate = useTranslate()
  const location = useLocation()
  const [unstakeTxid, setUnstakeTxid] = useState<string>()
  const queryClient = useQueryClient()
  const dispatch = useAppDispatch()
  const { getValues } = useFormContext<UnstakeFormValues>()
  const { isDrawerOpen, openDrawer } = useActionCenterContext()
  const toast = useToast({
    duration: isDrawerOpen ? 5000 : null,
    position: 'bottom-right',
  })

  const accountId = useAppSelector(state => {
    const accountIdsByAccountNumberAndChainId = selectAccountIdByAccountNumberAndChainId(state)
    const accountNumberAccounts = accountIdsByAccountNumberAndChainId[activeAccountNumber]
    return accountNumberAccounts?.[thorchainChainId] ?? ''
  })

  const handleTxConfirmed = useCallback(async () => {
    if (!unstakeTxid) throw new Error('Unstake Txid is required')

    const amountCryptoPrecision = bnOrZero(getValues('amountCryptoPrecision')).toFixed()

    dispatch(
      actionSlice.actions.upsertAction({
        id: unstakeTxid,
        type: ActionType.GenericTransaction,
        status: ActionStatus.Complete,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        transactionMetadata: {
          displayType: GenericTransactionDisplayType.TCY,
          txHash: unstakeTxid,
          chainId: thorchainChainId,
          accountId,
          assetId: tcyAssetId,
          message: translate(`TCY.unstakeStatus.successSubtitle`, {
            amount: amountCryptoPrecision,
          }),
        },
      }),
    )

    toast({
      id: unstakeTxid,
      duration: isDrawerOpen ? 5000 : null,
      status: 'success',
      render: ({ onClose, ...props }) => {
        const handleClick = () => {
          onClose()
          openDrawer()
        }

        return (
          <GenericTransactionNotification
            // eslint-disable-next-line react-memo/require-usememo
            handleClick={handleClick}
            actionId={unstakeTxid}
            onClose={onClose}
            {...props}
          />
        )
      },
    })
    await queryClient.invalidateQueries({ queryKey: ['tcy-staker'] })
  }, [
    queryClient,
    getValues,
    dispatch,
    unstakeTxid,
    accountId,
    isDrawerOpen,
    openDrawer,
    toast,
    translate,
  ])

  const renderUnstakeInput = useCallback(() => {
    return (
      <UnstakeInput headerComponent={headerComponent} activeAccountNumber={activeAccountNumber} />
    )
  }, [headerComponent, activeAccountNumber])

  const renderUnstakeConfirm = useCallback(() => {
    return <UnstakeConfirm setUnstakeTxid={setUnstakeTxid} />
  }, [])

  const renderUnstakeStatus = () => {
    if (!unstakeTxid) return null
    return (
      <UnstakeStatus
        txId={unstakeTxid}
        setUnstakeTxid={setUnstakeTxid}
        onTxConfirmed={handleTxConfirmed}
      />
    )
  }

  return (
    <AnimatedSwitch>
      <Switch location={location.pathname}>
        <Route path={TCYUnstakeRoute.Input}>{renderUnstakeInput()}</Route>
        <Route path={TCYUnstakeRoute.Confirm}>{renderUnstakeConfirm()}</Route>
        <Route path={TCYUnstakeRoute.Status}>{renderUnstakeStatus()}</Route>
      </Switch>
    </AnimatedSwitch>
  )
}
