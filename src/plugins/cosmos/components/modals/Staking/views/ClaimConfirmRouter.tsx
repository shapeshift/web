import { Flex } from '@chakra-ui/layout'
import { CAIP19 } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router-dom'
import { RouteSteps } from 'components/RouteSteps/RouteSteps'
import { SlideTransition } from 'components/SlideTransition'
import { BigNumber } from 'lib/bignumber/bignumber'

import { StakingAction } from '../StakingCommon'
import { ClaimBroadcast } from './ClaimBroadcast'
import { ClaimPath } from './ClaimCommon'
import { ClaimConfirm } from './ClaimConfirm'

export type ClaimConfirmProps = {
  cryptoAmount: BigNumber
  fiatAmountAvailable: string
  assetId: CAIP19
}

export const claimConfirmRoutes = [
  { step: 0, path: ClaimPath.Confirm, label: 'Confirm' },
  { step: 1, path: ClaimPath.Broadcast, label: 'Broadcast' }
]

const CosmosClaimRouter = ({ cryptoAmount, fiatAmountAvailable, assetId }: ClaimConfirmProps) => {
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
        <Flex minWidth={{ base: '100%' }} flexDirection='column'>
          <RouteSteps
            assetSymbol={asset.symbol}
            action={StakingAction.Claim}
            routes={claimConfirmRoutes}
            location={location}
            px={{ sm: '120px' }}
            borderTopRadius='12px'
          />
          <Flex direction='column' minWidth='450px'>
            <Route exact key={ClaimPath.Confirm} path={ClaimPath.Confirm}>
              <ClaimConfirm
                cryptoStakeAmount={cryptoAmount}
                fiatAmountAvailable={fiatAmountAvailable}
                assetId={assetId}
              />
            </Route>
            <Route exact key={ClaimPath.Broadcast} path={ClaimPath.Broadcast}>
              <ClaimBroadcast
                cryptoStakeAmount={cryptoAmount}
                fiatAmountAvailable={fiatAmountAvailable}
                assetId={assetId}
                isLoading={true}
              />
            </Route>
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
