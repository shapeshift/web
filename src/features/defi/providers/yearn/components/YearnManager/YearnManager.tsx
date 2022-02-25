import { Center, Heading, Stack } from '@chakra-ui/layout'
import { DefiActionButtons } from 'features/defi/components/DefiActionButtons'
import { DefiParams } from 'features/defi/contexts/DefiManagerProvider/DefiManagerProvider'
import { useYearn } from 'features/defi/contexts/YearnProvider/YearnProvider'
import { Location } from 'history'
import { MemoryRouter, Route, Switch, useHistory, useLocation, useParams } from 'react-router'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'

import { YearnDeposit } from './Deposit/YearnDeposit'
import { YearnWithdraw } from './Withdraw/YearnWithdraw'

type YearnRouteProps = {
  parentLocation: Location
} & DefiParams

const YearnRoutes = ({ parentLocation, provider, earnType }: YearnRouteProps) => {
  const { yearn } = useYearn()
  const location = useLocation()
  const history = useHistory()
  if (!yearn)
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  return (
    <>
      <Stack
        bg='gray.800'
        py={2}
        width='full'
        alignItems='center'
        borderTopRadius='lg'
        borderBottomWidth={1}
        borderColor='gray.750'
        spacing={2}
      >
        <Heading textTransform='capitalize' textAlign='center' fontSize='md'>
          {provider} {earnType}
        </Heading>
        <DefiActionButtons vaultExpired={false} />
      </Stack>
      <Switch location={parentLocation} key={parentLocation.key}>
        <Route path={`/defi/vault/yearn/deposit`}>
          <YearnDeposit api={yearn} location={location} history={history} />
        </Route>
        <Route path={`/defi/vault/yearn/withdraw`}>
          <YearnWithdraw api={yearn} location={location} history={history} />
        </Route>
      </Switch>
    </>
  )
}

export const YearnManager = () => {
  const location = useLocation()
  const params = useParams<DefiParams>()

  return (
    <MemoryRouter>
      <Switch>
        <Route path='/' render={() => <YearnRoutes parentLocation={location} {...params} />} />
      </Switch>
    </MemoryRouter>
  )
}
