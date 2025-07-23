import { thorchainChainId } from '@shapeshiftoss/caip'
import { lazy, useCallback } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, useLocation } from 'react-router'
import { Route, Switch } from 'wouter'

import type { TCYRouteProps } from '../../types'
import { TCYUnstakeRoute } from '../../types'

import { AnimatedSwitch } from '@/components/AnimatedSwitch'
import { selectAccountIdByAccountNumberAndChainId } from '@/state/slices/portfolioSlice/selectors'
import { useAppSelector } from '@/state/store'
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
  const location = useLocation()

  const renderUnstakeInput = useCallback(() => {
    return (
      <UnstakeInput headerComponent={headerComponent} activeAccountNumber={activeAccountNumber} />
    )
  }, [headerComponent, activeAccountNumber])

  const renderUnstakeConfirm = useCallback(() => {
    return <UnstakeConfirm />
  }, [])

  return (
    <AnimatedSwitch>
      <Switch location={location.pathname}>
        <Route path={TCYUnstakeRoute.Input}>{renderUnstakeInput()}</Route>
        <Route path={TCYUnstakeRoute.Confirm}>{renderUnstakeConfirm()}</Route>
      </Switch>
    </AnimatedSwitch>
  )
}
