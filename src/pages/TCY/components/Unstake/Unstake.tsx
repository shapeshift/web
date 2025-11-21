import { lazy, useCallback } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, useLocation } from 'react-router'
import { Route, Switch } from 'wouter'

import type { CurrentAccount } from '../../tcy'
import type { TCYRouteProps } from '../../types'
import { TCYUnstakeRoute } from '../../types'

import { AnimatedSwitch } from '@/components/AnimatedSwitch'
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

export const Unstake: React.FC<TCYRouteProps & { currentAccount: CurrentAccount }> = ({
  headerComponent,
  currentAccount,
}) => {
  'use no memo'
  const accountId = currentAccount.accountId ?? ''

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
        <UnstakeRoutes headerComponent={headerComponent} currentAccount={currentAccount} />
      </MemoryRouter>
    </FormProvider>
  )
}

export const UnstakeRoutes: React.FC<TCYRouteProps & { currentAccount: CurrentAccount }> = ({
  headerComponent,
  currentAccount,
}) => {
  const location = useLocation()

  const renderUnstakeInput = useCallback(() => {
    return <UnstakeInput headerComponent={headerComponent} currentAccount={currentAccount} />
  }, [headerComponent, currentAccount])

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
