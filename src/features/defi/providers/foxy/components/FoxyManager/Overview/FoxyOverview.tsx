import { Center, Flex } from '@chakra-ui/react'
import { AssetNamespace, caip19 } from '@shapeshiftoss/caip'
import { FoxyApi } from '@shapeshiftoss/investor-foxy'
import { NetworkTypes } from '@shapeshiftoss/types'
import {
  DefiParams,
  DefiQueryParams
} from 'features/defi/contexts/DefiManagerProvider/DefiManagerProvider'
import { AnimatePresence } from 'framer-motion'
import { matchPath, Route, Switch, useLocation } from 'react-router'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { SlideTransition } from 'components/SlideTransition'
import { useBrowserRouter } from 'context/BrowserRouterProvider/BrowserRouterProvider'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useFoxyBalances } from 'pages/Defi/hooks/useFoxyBalances'
import { selectAssetByCAIP19 } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Claim } from './Claim/Claim'
import { FoxyDetails } from './FoxyDetails'
import { FoxyEmpty } from './FoxyEmpty'

type FoxyOverViewProps = {
  api: FoxyApi
}

export const FoxyOverview = ({ api }: FoxyOverViewProps) => {
  const location = useLocation()
  const { opportunities, loading } = useFoxyBalances()
  const {
    query,
    history: browserHistory,
    location: browserLocation
  } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const match = matchPath<DefiParams>(browserLocation.pathname, {
    path: '/defi/:earnType/:provider/:action',
    exact: true
  })
  const { chain, contractAddress, tokenId, rewardId } = query
  const opportunity = opportunities.find(e => e.contractAddress === contractAddress)
  const foxyBalance = bnOrZero(opportunity?.balance)
  const network = NetworkTypes.MAINNET
  const assetNamespace = AssetNamespace.ERC20
  const stakingAssetCAIP19 = caip19.toCAIP19({
    chain,
    network,
    assetNamespace,
    assetReference: tokenId
  })
  const stakingAsset = useAppSelector(state => selectAssetByCAIP19(state, stakingAssetCAIP19))
  const rewardAssetCAIP19 = caip19.toCAIP19({
    chain,
    network,
    assetNamespace,
    assetReference: rewardId
  })
  const rewardAsset = useAppSelector(state => selectAssetByCAIP19(state, rewardAssetCAIP19))

  if (loading) {
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress isIndeterminate />
      </Center>
    )
  }
  return (
    <Flex width='full' minWidth={{ base: '100%', xl: '500px' }} flexDir='column'>
      <Flex flexDir='column' width='full' minWidth='400px'>
        <AnimatePresence exitBeforeEnter initial={false}>
          <Switch location={location} key={location.key}>
            <Route exact path='/'>
              <SlideTransition>
                {foxyBalance.gt(0) ? (
                  <FoxyDetails
                    api={api}
                    contractAddress={contractAddress}
                    asset={stakingAsset}
                    rewardAsset={rewardAsset}
                  />
                ) : (
                  <FoxyEmpty
                    assets={[stakingAsset, rewardAsset]}
                    apy={bnOrZero(opportunity?.apy).times(100).toString()}
                    onClick={() =>
                      browserHistory.push({
                        ...browserLocation,
                        pathname: `/defi/${match?.params.earnType}/${match?.params.provider}/deposit/`
                      })
                    }
                  />
                )}
              </SlideTransition>
            </Route>
            <Route exact path='/claim' component={Claim} />
          </Switch>
        </AnimatePresence>
      </Flex>
    </Flex>
  )
}
