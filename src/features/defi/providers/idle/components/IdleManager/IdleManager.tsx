import { Center, Heading, Stack } from '@chakra-ui/layout'
import { ModalHeader, useColorModeValue } from '@chakra-ui/react'
import { DefiActionButtons } from 'features/defi/components/DefiActionButtons'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useIdle } from 'features/defi/contexts/IdleProvider/IdleProvider'
import { AnimatePresence } from 'framer-motion'
import { Location } from 'history'
import { useEffect } from 'react'
import { matchPath, MemoryRouter, Route, Switch, useLocation, useParams } from 'react-router'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { SlideTransition } from 'components/SlideTransition'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

import { IdleDeposit } from './Deposit/IdleDeposit'
import { IdleWithdraw } from './Withdraw/IdleWithdraw'

enum IdlePath {
  Deposit = '/defi/vault/idle/deposit',
  Withdraw = '/defi/vault/idle/withdraw',
  Overview = `/defi/vault/idle/overview`,
}

type IdleRouteProps = {
  parentLocation: Location
} & DefiParams

const IdleRoutes = ({ parentLocation, provider, earnType }: IdleRouteProps) => {
  const { idle } = useIdle()
  const headerBg = useColorModeValue('gray.50', 'gray.800')
  const { location, history } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const match = matchPath<DefiParams>(location.pathname, {
    path: '/defi/:earnType/:provider/:action',
    exact: true,
  })

  useEffect(() => {
    // redirect from overview to deposit till we hook up overview for idle vaults
    if (location.pathname === IdlePath.Overview) {
      if (match?.params) {
        const { earnType, provider } = match.params
        history.replace({
          ...location,
          pathname: `/defi/${earnType}/${provider}/${DefiAction.Deposit}/`,
        })
      }
    }
  }, [history, location, match])
  if (!idle)
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  return (
    <>
      <ModalHeader bg={headerBg} borderTopRadius='xl'>
        <Stack width='full' alignItems='center' spacing={2}>
          <Heading textTransform='capitalize' textAlign='center' fontSize='md'>
            {provider} {earnType}
          </Heading>
          <DefiActionButtons vaultExpired={false} />
        </Stack>
      </ModalHeader>
      <AnimatePresence exitBeforeEnter initial={false}>
        <Switch location={parentLocation} key={parentLocation.key}>
          <Route path={IdlePath.Deposit} key={IdlePath.Deposit}>
            <MemoryRouter>
              <SlideTransition>
                <IdleDeposit idleInvestor={idle} />
              </SlideTransition>
            </MemoryRouter>
          </Route>
          <Route path={IdlePath.Withdraw} key={IdlePath.Withdraw}>
            <MemoryRouter>
              <SlideTransition>
                <IdleWithdraw idleInvestor={idle} />
              </SlideTransition>
            </MemoryRouter>
          </Route>
        </Switch>
      </AnimatePresence>
    </>
  )
}

export const IdleManager = () => {
  const location = useLocation()
  const params = useParams<DefiParams>()

  return <IdleRoutes parentLocation={location} {...params} />
}
