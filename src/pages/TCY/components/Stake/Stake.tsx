import { useToast } from '@chakra-ui/react'
import { thorchainChainId } from '@shapeshiftoss/caip'
import { useQueryClient } from '@tanstack/react-query'
import { lazy, useCallback, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, useLocation } from 'react-router'
import { v4 as uuidv4 } from 'uuid'
import { Route, Switch } from 'wouter'

import type { TCYRouteProps } from '../../types'
import { TCYStakeRoute } from '../../types'

import { AnimatedSwitch } from '@/components/AnimatedSwitch'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { ActionStatus, ActionType } from '@/state/slices/actionSlice/types'
import { selectAccountIdByAccountNumberAndChainId } from '@/state/slices/portfolioSlice/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'
import { makeSuspenseful } from '@/utils/makeSuspenseful'

const defaultBoxSpinnerStyle = {
  height: '500px',
}

const StakeInput = makeSuspenseful(
  lazy(() =>
    import('./StakeInput').then(({ StakeInput }) => ({
      default: StakeInput,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const StakeConfirm = makeSuspenseful(
  lazy(() =>
    import('./StakeConfirm').then(({ StakeConfirm }) => ({
      default: StakeConfirm,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const StakeStatus = makeSuspenseful(
  lazy(() =>
    import('./StakeStatus').then(({ StakeStatus }) => ({
      default: StakeStatus,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const StakeEntries = [TCYStakeRoute.Input, TCYStakeRoute.Confirm, TCYStakeRoute.Status]

export type StakeFormValues = {
  amountCryptoPrecision: string
  fiatAmount: string
  accountId: string
}

export const Stake: React.FC<TCYRouteProps & { activeAccountNumber: number }> = ({
  headerComponent,
  activeAccountNumber,
}) => {
  const accountId = useAppSelector(state => {
    const accountIdsByAccountNumberAndChainId = selectAccountIdByAccountNumberAndChainId(state)
    const accountNumberAccounts = accountIdsByAccountNumberAndChainId[activeAccountNumber]
    return accountNumberAccounts?.[thorchainChainId] ?? ''
  })

  const methods = useForm<StakeFormValues>({
    mode: 'onChange',
    defaultValues: {
      amountCryptoPrecision: '',
      fiatAmount: '',
      accountId,
    },
  })

  return (
    <FormProvider {...methods}>
      <MemoryRouter initialEntries={StakeEntries} initialIndex={0}>
        <StakeRoutes headerComponent={headerComponent} activeAccountNumber={activeAccountNumber} />
      </MemoryRouter>
    </FormProvider>
  )
}

export const StakeRoutes: React.FC<TCYRouteProps & { activeAccountNumber: number }> = ({
  headerComponent,
  activeAccountNumber,
}) => {
  const location = useLocation()
  const [stakeTxid, setStakeTxid] = useState<string>()
  const queryClient = useQueryClient()
  const dispatch = useAppDispatch()

  const toast = useToast({
    duration: 5000,
    position: 'bottom-right',
  })

  const accountId = useAppSelector(state => {
    const accountIdsByAccountNumberAndChainId = selectAccountIdByAccountNumberAndChainId(state)
    const accountNumberAccounts = accountIdsByAccountNumberAndChainId[activeAccountNumber]
    return accountNumberAccounts?.[thorchainChainId] ?? ''
  })

  const handleTxConfirmed = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['tcy-staker'] })

    dispatch(
      actionSlice.actions.upsertAction({
        id: uuidv4(),
        type: ActionType.GenericTransaction,
        status: ActionStatus.Complete,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        message: 'TCY stake transaction confirmed',
        // TODO(gomes): this doesn't work as this gets reset, handleTxConfirmed should take tx hash as a closure
        txHash: stakeTxid,
        chainId: thorchainChainId,
        accountId,
      }),
    )

    toast({
      title: 'Transaction confirmed',
      description: 'Your TCY stake has been confirmed.',
      status: 'success',
      isClosable: true,
      position: 'top-right',
    })
  }, [queryClient])

  const renderStakeInput = useCallback(() => {
    return (
      <StakeInput headerComponent={headerComponent} activeAccountNumber={activeAccountNumber} />
    )
  }, [headerComponent, activeAccountNumber])

  const renderStakeConfirm = useCallback(() => {
    return <StakeConfirm setStakeTxid={setStakeTxid} />
  }, [])

  const renderStakeStatus = () => {
    if (!stakeTxid) return null
    return (
      <StakeStatus txId={stakeTxid} setStakeTxid={setStakeTxid} onTxConfirmed={handleTxConfirmed} />
    )
  }

  return (
    <AnimatedSwitch>
      <Switch location={location.pathname}>
        <Route path={TCYStakeRoute.Input}>{renderStakeInput()}</Route>
        <Route path={TCYStakeRoute.Confirm}>{renderStakeConfirm()}</Route>
        <Route path={TCYStakeRoute.Status}>{renderStakeStatus()}</Route>
      </Switch>
    </AnimatedSwitch>
  )
}
