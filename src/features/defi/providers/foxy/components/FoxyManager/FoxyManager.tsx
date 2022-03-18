import { Center, Heading, Stack } from '@chakra-ui/layout'
import { ModalHeader, useColorModeValue } from '@chakra-ui/react'
import { DefiActionButtons } from 'features/defi/components/DefiActionButtons'
import { DefiParams } from 'features/defi/contexts/DefiManagerProvider/DefiManagerProvider'
import { useFoxy } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import { AnimatePresence } from 'framer-motion'
import { Location } from 'history'
import { MemoryRouter, Route, Switch, useLocation, useParams } from 'react-router'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'

import { FoxyDeposit } from './Deposit/FoxyDeposit'
import { FoxyWithdraw } from './Withdraw/FoxyWithdraw'

enum FoxyPath {
  Deposit = '/defi/token_staking/ShapeShift/deposit',
  Withdraw = '/defi/token_staking/ShapeShift/withdraw',
  Overview = `/defi/token_staking/ShapeShift/overview`
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
          <DefiActionButtons vaultExpired={false} />
        </Stack>
      </ModalHeader>
      <AnimatePresence exitBeforeEnter initial={false}>
        <Switch location={parentLocation} key={parentLocation.key}>
          <Route path={FoxyPath.Deposit}>
            <MemoryRouter>
              <SlideTransition>
                <FoxyDeposit api={foxy} />
              </SlideTransition>
            </MemoryRouter>
          </Route>
          <Route path={FoxyPath.Withdraw}>
            <MemoryRouter>
              <SlideTransition>
                <FoxyWithdraw api={foxy} />
              </SlideTransition>
            </MemoryRouter>
          </Route>
          <Route path={FoxyPath.Overview}>
            <RawText>Overview</RawText>
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
