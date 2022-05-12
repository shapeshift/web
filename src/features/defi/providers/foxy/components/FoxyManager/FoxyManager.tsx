import { Center, Heading, Stack } from '@chakra-ui/layout'
import { ModalHeader, useColorModeValue } from '@chakra-ui/react'
import { DefiActionButtons } from 'features/defi/components/DefiActionButtons'
import { DefiParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxy } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import { AnimatePresence } from 'framer-motion'
import { Location } from 'history'
import { MemoryRouter, Route, Switch, useLocation, useParams } from 'react-router'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { SlideTransition } from 'components/SlideTransition'

import { FoxyDeposit } from './Deposit/FoxyDeposit'
import { FoxyOverview } from './Overview/FoxyOverview'
import { FoxyWithdraw } from './Withdraw/FoxyWithdraw'

enum FoxyPath {
  Deposit = '/defi/token_staking/ShapeShift/deposit',
  Withdraw = '/defi/token_staking/ShapeShift/withdraw',
  Overview = `/defi/token_staking/ShapeShift/overview`,
}

type FoxyRouteProps = {
  parentLocation: Location
} & DefiParams

const FoxyRoutes = ({ parentLocation, provider, earnType }: FoxyRouteProps) => {
  const { foxy } = useFoxy()
  const headerBg = useColorModeValue('gray.50', 'gray.800')

  if (!foxy)
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
            {provider} {earnType.replace('_', ' ')}
          </Heading>
          <DefiActionButtons showOverview vaultExpired={false} />
        </Stack>
      </ModalHeader>
      <AnimatePresence exitBeforeEnter initial={false}>
        <Switch location={parentLocation} key={parentLocation.key}>
          <Route path={FoxyPath.Deposit} key={FoxyPath.Deposit}>
            <MemoryRouter>
              <SlideTransition>
                <FoxyDeposit api={foxy} />
              </SlideTransition>
            </MemoryRouter>
          </Route>
          <Route path={FoxyPath.Withdraw} key={FoxyPath.Withdraw}>
            <MemoryRouter>
              <SlideTransition>
                <FoxyWithdraw api={foxy} />
              </SlideTransition>
            </MemoryRouter>
          </Route>
          <Route path={FoxyPath.Overview} key={FoxyPath.Overview}>
            <MemoryRouter>
              <SlideTransition>
                <FoxyOverview />
              </SlideTransition>
            </MemoryRouter>
          </Route>
        </Switch>
      </AnimatePresence>
    </>
  )
}

export const FoxyManager = () => {
  const location = useLocation()
  const params = useParams<DefiParams>()

  return <FoxyRoutes parentLocation={location} {...params} />
}
