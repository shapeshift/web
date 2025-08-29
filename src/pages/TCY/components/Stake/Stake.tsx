import { lazy, useCallback } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, useLocation } from 'react-router'
import { Route, Switch } from 'wouter'

import type { CurrentAccount } from '../../tcy'
import type { TCYRouteProps } from '../../types'
import { TCYStakeRoute } from '../../types'

import { AnimatedSwitch } from '@/components/AnimatedSwitch'
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

const StakeEntries = [TCYStakeRoute.Input, TCYStakeRoute.Confirm, TCYStakeRoute.Status]

export type StakeFormValues = {
  amountCryptoPrecision: string
  fiatAmount: string
  accountId: string
}

export const Stake: React.FC<TCYRouteProps & { currentAccount: CurrentAccount }> = ({
  headerComponent,
  currentAccount,
}) => {
  const accountId = currentAccount.accountId ?? ''

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
        <StakeRoutes headerComponent={headerComponent} currentAccount={currentAccount} />
      </MemoryRouter>
    </FormProvider>
  )
}

export const StakeRoutes: React.FC<TCYRouteProps & { currentAccount: CurrentAccount }> = ({
  headerComponent,
  currentAccount,
}) => {
  const location = useLocation()

  const renderStakeInput = useCallback(() => {
    return <StakeInput headerComponent={headerComponent} currentAccount={currentAccount} />
  }, [headerComponent, currentAccount])

  const renderStakeConfirm = useCallback(() => {
    return <StakeConfirm />
  }, [])

  return (
    <AnimatedSwitch>
      <Switch location={location.pathname}>
        <Route path={TCYStakeRoute.Input}>{renderStakeInput()}</Route>
        <Route path={TCYStakeRoute.Confirm}>{renderStakeConfirm()}</Route>
      </Switch>
    </AnimatedSwitch>
  )
}
