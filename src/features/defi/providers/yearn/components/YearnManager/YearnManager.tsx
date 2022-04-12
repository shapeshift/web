import { Center, Heading, Stack } from '@chakra-ui/layout'
import { ModalHeader, useColorModeValue } from '@chakra-ui/react'
import { DefiActionButtons } from 'features/defi/components/DefiActionButtons'
import {
  DefiAction,
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import { AnimatePresence } from 'framer-motion'
import { Location } from 'history'
import { useEffect } from 'react'
import { matchPath, MemoryRouter, Route, Switch, useLocation, useParams } from 'react-router'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { SlideTransition } from 'components/SlideTransition'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

import { YearnDeposit } from './Deposit/YearnDeposit'
import { YearnWithdraw } from './Withdraw/YearnWithdraw'

enum YearnPath {
  Deposit = '/defi/vault/yearn/deposit',
  Withdraw = '/defi/vault/yearn/withdraw',
  Overview = `/defi/vault/yearn/overview`,
}

type YearnRouteProps = {
  parentLocation: Location
} & DefiParams

const YearnRoutes = ({ parentLocation, provider, earnType }: YearnRouteProps) => {
  const { yearn } = useYearn()
  const headerBg = useColorModeValue('gray.50', 'gray.800')
  const { location, history } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const match = matchPath<DefiParams>(location.pathname, {
    path: '/defi/:earnType/:provider/:action',
    exact: true,
  })

  useEffect(() => {
    // redirect from overview to deposit till we hook up overview for yearn vaults
    if (location.pathname === YearnPath.Overview) {
      if (match?.params) {
        const { earnType, provider } = match.params
        history.replace({
          ...location,
          pathname: `/defi/${earnType}/${provider}/${DefiAction.Deposit}/`,
        })
      }
    }
  }, [history, location, match])
  if (!yearn)
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
          <Route path={YearnPath.Deposit}>
            <MemoryRouter>
              <SlideTransition>
                <YearnDeposit api={yearn} />
              </SlideTransition>
            </MemoryRouter>
          </Route>
          <Route path={YearnPath.Withdraw}>
            <MemoryRouter>
              <SlideTransition>
                <YearnWithdraw api={yearn} />
              </SlideTransition>
            </MemoryRouter>
          </Route>
        </Switch>
      </AnimatePresence>
    </>
  )
}

export const YearnManager = () => {
  const location = useLocation()
  const params = useParams<DefiParams>()

  return <YearnRoutes parentLocation={location} {...params} />
}
