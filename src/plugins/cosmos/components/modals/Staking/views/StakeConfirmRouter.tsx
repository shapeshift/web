import { Flex } from '@chakra-ui/layout'
import { CAIP19 } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router-dom'
import { RouteSteps } from 'components/RouteSteps/RouteSteps'
import { SlideTransition } from 'components/SlideTransition'
import { BigNumber } from 'lib/bignumber/bignumber'

import { StakeBroadcast } from './StakeBroadcast'
import { StakeConfirm } from './StakeConfirm'

export type StakingConfirmProps = {
  cryptoAmount: BigNumber
  assetId: CAIP19
  fiatRate: BigNumber
  apr: string
  onCancel: () => void
}

export enum StakingPath {
  Confirm = '/staking/confirm',
  Broadcast = '/staking/broadcast'
}

export const stakeConfirmRoutes = [
  { step: 0, path: StakingPath.Confirm, label: 'Confirm Details' },
  { step: 1, path: StakingPath.Broadcast, label: 'Broadcast TX' }
]

const CosmosStakingRouter = ({
  cryptoAmount,
  onCancel,
  assetId,
  fiatRate,
  apr
}: StakingConfirmProps) => {
  const location = useLocation<StakingConfirmProps>()

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
            px={23}
            py={43}
            routes={stakeConfirmRoutes}
            location={location}
          />
          <Flex
            flexDir='column'
            width='full'
            minWidth={{ base: 'auto', lg: '450px' }}
            maxWidth={{ base: 'auto', lg: '450px' }}
          >
            <Flex direction='column' minWidth='400px'>
              <Route exact key={StakingPath.Confirm} path={StakingPath.Confirm}>
                <StakeConfirm
                  apr={apr}
                  cryptoStakeAmount={cryptoAmount}
                  assetId={assetId}
                  fiatRate={fiatRate}
                  onCancel={onCancel}
                />
              </Route>
              <Route exact key={StakingPath.Broadcast} path={StakingPath.Broadcast}>
                <StakeBroadcast
                  apr={apr}
                  cryptoStakeAmount={cryptoAmount}
                  assetId={assetId}
                  fiatRate={fiatRate}
                  onCancel={onCancel}
                />
              </Route>
            </Flex>
          </Flex>
        </Flex>
      </Switch>
    </SlideTransition>
  )
}

export const StakeConfirmRouter = (props: StakingConfirmProps) => (
  <SlideTransition>
    <MemoryRouter
      key='stake'
      initialIndex={0}
      initialEntries={stakeConfirmRoutes.map(route => route.path)}
    >
      <CosmosStakingRouter {...props} />
    </MemoryRouter>
  </SlideTransition>
)
