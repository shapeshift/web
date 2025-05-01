import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { lazy, useCallback } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { Route, Switch } from 'wouter'

import { TCYClaimRoute, TransactionStatus } from '../../types'
import type { Claim } from './types'

import { AnimatedSwitch } from '@/components/AnimatedSwitch'
import { makeSuspenseful } from '@/utils/makeSuspenseful'

const defaultBoxSpinnerStyle = {
  height: '500px',
}

const ClaimConfirm = makeSuspenseful(
  lazy(() =>
    import('./ClaimConfirm').then(({ ClaimConfirm }) => ({
      default: ClaimConfirm,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const ClaimStatus = makeSuspenseful(
  lazy(() =>
    import('./ClaimStatus').then(({ ClaimStatus }) => ({
      default: ClaimStatus,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const initialEntries = [TCYClaimRoute.Confirm, TCYClaimRoute.Status]

const ClaimContent = ({ claim }: { claim: Claim | undefined }) => {
  return (
    <MemoryRouter initialEntries={initialEntries} initialIndex={0}>
      <ClaimRoutes claim={claim} />
    </MemoryRouter>
  )
}

const ClaimRoutes = ({ claim }: { claim: Claim | undefined }) => {
  const location = useLocation()
  const renderClaimConfirm = useCallback(() => {
    return <ClaimConfirm claim={claim} />
  }, [claim])

  const renderClaimStatus = useCallback(() => {
    return <ClaimStatus status={TransactionStatus.Pending} />
  }, [])

  return (
    <AnimatedSwitch>
      <Switch location={location.pathname}>
        <Route path={TCYClaimRoute.Confirm}>{renderClaimConfirm()}</Route>
        <Route path={TCYClaimRoute.Status}>{renderClaimStatus()}</Route>
      </Switch>
    </AnimatedSwitch>
  )
}

type ClaimModalProps = {
  isOpen: boolean
  onClose: () => void
  claim: Claim | undefined
}

export const ClaimModal = ({ isOpen, onClose, claim }: ClaimModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ClaimContent claim={claim} />
      </ModalContent>
    </Modal>
  )
}
