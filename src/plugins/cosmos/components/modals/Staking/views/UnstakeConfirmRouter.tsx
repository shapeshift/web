import { Flex } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router-dom'
import { RouteSteps } from 'components/RouteSteps/RouteSteps'
import { SlideTransition } from 'components/SlideTransition'
import { BigNumber } from 'lib/bignumber/bignumber'

import { StakingAction } from '../Staking'
import { UnstakeConfirm } from './UnstakeConfirm'

type UnstakingConfirmProps = {
  cryptoAmount: BigNumber
  assetId: CAIP19
  fiatRate: BigNumber
  onCancel: () => void
}

export enum UnstakingPath {
  Confirm = '/unstaking/confirm',
  Broadcast = '/unstaking/broadcast'
}

export const withdrawRoutes = [
  { step: 0, path: UnstakingPath.Confirm, label: 'Confirm Details' },
  { step: 1, path: UnstakingPath.Broadcast, label: 'Broadcast TX' }
]

const CosmosUnstakingRouter = ({
  cryptoAmount,
  assetId,
  fiatRate,
  onCancel
}: UnstakingConfirmProps) => {
  const location = useLocation<UnstakingConfirmProps>()

  // TODO: wire me up, parentheses are nice but let's get asset name from selectAssetNameById instead of this
  const asset = (_ => ({
    name: 'Osmosis',
    symbol: 'OSMO',
    caip19: assetId
  }))(assetId) as Asset

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Flex minWidth={{ base: '100%', xl: '500px' }} flexDir={{ base: 'column', lg: 'row' }}>
          <RouteSteps
            assetSymbol={asset.symbol}
            action={StakingAction.Unstake}
            px={23}
            py={43}
            routes={withdrawRoutes}
            location={location}
          />
          <Flex
            flexDir='column'
            width='full'
            minWidth={{ base: 'auto', lg: '450px' }}
            maxWidth={{ base: 'auto', lg: '450px' }}
          >
            <Flex flexDirection='column' minWidth='400px'>
              <Route exact key={UnstakingPath.Confirm} path={UnstakingPath.Confirm}>
                <UnstakeConfirm
                  cryptoUnstakeAmount={cryptoAmount}
                  assetId={assetId}
                  fiatRate={fiatRate}
                  onCancel={onCancel}
                />
              </Route>
              <Route exact key={UnstakingPath.Broadcast} path={UnstakingPath.Broadcast}>
                TODO Unstaking Broadcast component
              </Route>
            </Flex>
          </Flex>
        </Flex>
      </Switch>
    </AnimatePresence>
  )
}

export const UnstakeConfirmRouter = (props: UnstakingConfirmProps) => {
  return (
    <SlideTransition>
      <MemoryRouter
        key='stake'
        initialIndex={0}
        initialEntries={withdrawRoutes.map(route => route.path)}
      >
        <CosmosUnstakingRouter {...props} />
      </MemoryRouter>
    </SlideTransition>
  )
}
