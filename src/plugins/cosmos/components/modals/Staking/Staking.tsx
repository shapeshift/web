import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { useRef } from 'react'
import { useModal } from 'context/ModalProvider/ModalProvider'

import { Stake } from './views/Stake'
import { Unstake } from './views/Unstake'

export enum StakingAction {
  Stake = 'stake',
  Unstake = 'unstake'
}

type StakingModalProps = {
  assetId: CAIP19
  action: StakingAction
}

export const StakingModal = ({ assetId, action }: StakingModalProps) => {
  const initialRef = useRef<HTMLInputElement>(null)
  const { cosmosStaking } = useModal()
  const { close, isOpen } = cosmosStaking

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered initialFocusRef={initialRef}>
      <ModalOverlay />
      <ModalContent>
        {action === StakingAction.Stake ? (
          <Stake
            assetId={assetId}
            apr='0.12'
            cryptoAmountAvailable='4242'
            fiatAmountAvailable='106050'
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
            apr='0.12'
            cryptoAmountStaked='4242'
            marketData={{
              price: '25',
              marketCap: '999999',
              volume: '1000',
              changePercent24Hr: 2
            }}
          />
        )}
      </ModalContent>
    </Modal>
  )
}
