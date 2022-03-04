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

import { StakingAction } from '../Staking/Staking'
import { Confirm } from './views/Confirm'

type UnstakingConfirmProps = {
  cryptoAmount: BigNumber
  assetId: CAIP19
  fiatRate: BigNumber
}

export enum UnstakingPath {
  Confirm = '/unstaking/confirm',
  Broadcast = '/unstaking/broadcast'
}

export const withdrawRoutes = [
  { step: 0, path: UnstakingPath.Confirm, label: 'Confirm Details' },
  { step: 1, path: UnstakingPath.Broadcast, label: 'Broadcast TX' }
]

type UnstakingLocationProps = {
  cryptoAmount: BigNumber
  assetId: string
  fiatRate: BigNumber
}
//
const CosmosUnstakingRouter = ({ cryptoAmount, assetId, fiatRate }: UnstakingLocationProps) => {
  const location = useLocation<UnstakingLocationProps>()

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
          />
          <Flex
            flexDir='column'
            width='full'
            minWidth={{ base: 'auto', lg: '450px' }}
            maxWidth={{ base: 'auto', lg: '450px' }}
          >
            <Flex direction='column' minWidth='400px'>
              <Route exact key={UnstakingPath.Confirm} path={UnstakingPath.Confirm}>
                <Confirm cryptoUnstakeAmount={cryptoAmount} assetId={assetId} fiatRate={fiatRate} />
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

export const UnstakingConfirmModal = (props: UnstakingConfirmProps) => {
  const initialRef = useRef<HTMLInputElement>(null)
  const { cosmosUnstakingConfirm } = useModal()
  const { close, isOpen } = cosmosUnstakingConfirm

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered initialFocusRef={initialRef} variant='fluid'>
      <ModalOverlay />
      <ModalContent>
        <MemoryRouter
          key='stake'
          initialIndex={0}
          initialEntries={withdrawRoutes.map(route => route.path)}
        >
          <CosmosUnstakingRouter {...props} />
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
