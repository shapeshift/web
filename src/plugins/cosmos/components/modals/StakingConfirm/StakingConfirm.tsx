import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { Flex } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { useRef } from 'react'
import { MemoryRouter, Route, Switch, useLocation } from 'react-router-dom'
import { RouteSteps } from 'components/RouteSteps/RouteSteps'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { BigNumber } from 'lib/bignumber/bignumber'

import { Confirm } from './views/Confirm'

type StakingConfirmProps = {
  cryptoAmount: BigNumber
  assetId: CAIP19
  fiatRate: BigNumber
  apr: string
}

export enum StakingPath {
  Confirm = '/staking/confirm',
  Broadcast = '/staking/broadcast'
}

export const depositRoutes = [
  { step: 0, path: StakingPath.Confirm, label: 'Confirm Details' },
  { step: 1, path: StakingPath.Broadcast, label: 'Broadcast TX' }
]

type StakingLocationProps = {
  cryptoAmount: BigNumber
  assetId: string
  fiatRate: BigNumber
  apr: string
}
//
const CosmosStakingRouter = ({ cryptoAmount, assetId, fiatRate, apr }: StakingLocationProps) => {
  const location = useLocation<StakingLocationProps>()

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
            px={23}
            py={43}
            routes={depositRoutes}
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
                <Confirm
                  apr={apr}
                  cryptoStakeAmount={cryptoAmount}
                  assetId={assetId}
                  fiatRate={fiatRate}
                />
              </Route>
              <Route exact key={StakingPath.Broadcast} path={StakingPath.Broadcast}>
                TODO Staking Broadcast component
              </Route>
            </Flex>
          </Flex>
        </Flex>
      </Switch>
    </AnimatePresence>
  )
}

export const StakingConfirmModal = (props: StakingConfirmProps) => {
  const initialRef = useRef<HTMLInputElement>(null)
  const { cosmosStakingConfirm } = useModal()
  const { close, isOpen } = cosmosStakingConfirm

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered initialFocusRef={initialRef} variant='fluid'>
      <ModalOverlay />
      <ModalContent>
        <MemoryRouter
          key='stake'
          initialIndex={0}
          initialEntries={depositRoutes.map(route => route.path)}
        >
          <CosmosStakingRouter {...props} />
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
