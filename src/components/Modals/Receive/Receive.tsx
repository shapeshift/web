import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { MemoryRouter, Route,  Routes} from 'react-router-dom'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'

import { ReceiveRouter } from './ReceiveRouter'
import { useParams } from 'react-router-dom'

export enum ReceiveRoutes {
  Info = '/receive/info',
  Select = '/receive/select'
}

export const entries = [ReceiveRoutes.Info, ReceiveRoutes.Select]

type ReceivePropsType = {
  asset?: Asset
  accountId?: AccountSpecifier
}

const Receive = ({ asset, accountId }: ReceivePropsType) => {
  const { receive } = useModal()
  const { close, isOpen } = receive
  const params = useParams()

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered>
      <ModalOverlay />
      <ModalContent>
        <MemoryRouter initialEntries={entries}>
          <Routes>
            <Route
              path='/'
              element={(params ) => (
                <ReceiveRouter asset={asset} accountId={accountId} {...params} />
              )}
            />
          </Routes>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}

export const ReceiveModal = Receive
