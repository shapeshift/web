import { Center } from '@chakra-ui/layout'
import {
  DefiAction,
  DefiParams
} from 'features/defi/contexts/DefiManagerProvider/DefiManagerProvider'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import { MemoryRouter, useParams } from 'react-router'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'

import { routes as deposit, YearnDeposit } from './Deposit/YearnDeposit'
import { routes as withdraw, YearnWithdraw } from './Withdraw/YearnWithdraw'

export const YearnManager = () => {
  const params = useParams<DefiParams>()
  const { yearn } = useYearn()

  if (!yearn)
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )

  return params.action === DefiAction.Deposit ? (
    <MemoryRouter key='deposit' initialIndex={0} initialEntries={deposit.map(route => route.path)}>
      <YearnDeposit api={yearn} />
    </MemoryRouter>
  ) : (
    <MemoryRouter
      key='withdraw'
      initialIndex={0}
      initialEntries={withdraw.map(route => route.path)}
    >
      <YearnWithdraw api={yearn} />
    </MemoryRouter>
  )
}
