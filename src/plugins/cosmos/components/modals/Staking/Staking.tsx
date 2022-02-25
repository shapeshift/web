import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { useRef } from 'react'
import { MemoryRouter, Route, Switch } from 'react-router-dom'
import { useModal } from 'context/ModalProvider/ModalProvider'

import { Stake } from './views/Stake'
import { Unstake } from './views/Unstake'

type StakedModalProps = {
  assetId: string
  action: StakingAction
}

export enum StakedModalRoutes {
  Stake = '/plugins/cosmos/stake',
  Unstake = '/plugins/cosmos/unstake'
}

export enum StakingAction {
  Stake = 'stake',
  Unstake = 'unstake'
}

export const entries = [StakedModalRoutes.Stake, StakedModalRoutes.Unstake]

export const StakingModal = ({ assetId, action }: StakedModalProps) => {
  const initialRef = useRef<HTMLInputElement>(null)
  const { cosmosStaking } = useModal()
  const { close, isOpen } = cosmosStaking

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered initialFocusRef={initialRef}>
      <ModalOverlay />
      <ModalContent>
        <MemoryRouter initialEntries={entries}>
          <Switch>
            <Route path='/'>
              {action === StakingAction.Stake ? (
                <Stake
                  assetId={assetId}
                  apr='1.25'
                  cryptoAmountAvailable='4242'
                  fiatAmountAvailable='100'
                  marketData={{
                    price: '25',
                    marketCap: '999999',
                    volume: '1000',
                    changePercent24Hr: 2
                  }}
                />
              ) : (
                <Unstake
                  assetId={assetId}
                  apr='1.25'
                  cryptoAmountStaked='4242'
                  marketData={{
                    price: '25',
                    marketCap: '999999',
                    volume: '1000',
                    changePercent24Hr: 2
                  }}
                />
              )}
            </Route>
          </Switch>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
