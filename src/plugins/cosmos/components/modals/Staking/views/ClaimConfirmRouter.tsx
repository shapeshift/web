import { Flex } from '@chakra-ui/layout'
import { CAIP19 } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router-dom'
import { RouteSteps } from 'components/RouteSteps/RouteSteps'
import { SlideTransition } from 'components/SlideTransition'
import { BigNumber } from 'lib/bignumber/bignumber'

import { StakingAction } from '../Staking'
import { ClaimConfirm } from './ClaimConfirm'

export type ClaimConfirmProps = {
  cryptoAmount: BigNumber
  assetId: CAIP19
  onCancel: () => void
}

export enum ClaimPath {
  Confirm = '/claim/confirm',
  Broadcast = '/claim/broadcast'
}

export const claimConfirmRoutes = [
  { step: 0, path: ClaimPath.Confirm, label: 'Confirm Details' },
  { step: 1, path: ClaimPath.Broadcast, label: 'Broadcast TX' }
]

const CosmosClaimRouter = ({ cryptoAmount, onCancel, assetId }: ClaimConfirmProps) => {
  const location = useLocation<ClaimConfirmProps>()

  // TODO: wire me up, parentheses are nice but let's get asset name from selectAssetNameById instead of this
  const asset = (_ => ({
    name: 'Osmosis',
    symbol: 'OSMO',
    caip19: assetId
  }))(assetId) as Asset

  return (
    <SlideTransition>
      <Switch location={location} key={location.key}>
        <Flex minWidth={{ base: '100%', xl: '500px' }} flexDir={{ base: 'column', lg: 'row' }}>
          <RouteSteps
            assetSymbol={asset.symbol}
            action={StakingAction.Claim}
            px={23}
            py={43}
            routes={claimConfirmRoutes}
            location={location}
          />
          <Flex
            flexDir='column'
            width='full'
            minWidth={{ base: 'auto', lg: '450px' }}
            maxWidth={{ base: 'auto', lg: '450px' }}
          >
            <Flex direction='column' minWidth='400px'>
              <Route exact key={ClaimPath.Confirm} path={ClaimPath.Confirm}>
                <ClaimConfirm
                  cryptoStakeAmount={cryptoAmount}
                  assetId={assetId}
                  onCancel={onCancel}
                />
              </Route>
              <Route exact key={ClaimPath.Broadcast} path={ClaimPath.Broadcast}>
                TODO Claim Broadcast component
              </Route>
            </Flex>
          </Flex>
        </Flex>
      </Switch>
    </SlideTransition>
  )
}

export const ClaimConfirmRouter = (props: ClaimConfirmProps) => (
  <SlideTransition>
    <MemoryRouter
      key='stake'
      initialIndex={0}
      initialEntries={claimConfirmRoutes.map(route => route.path)}
    >
      <CosmosClaimRouter {...props} />
    </MemoryRouter>
  </SlideTransition>
)
