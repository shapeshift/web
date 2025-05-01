import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { lazy, useCallback, useState } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { Route, Switch } from 'wouter'

import { TCYClaimRoute } from '../../types'
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
  const [txId, setTxId] = useState<string>('')

  return (
    <MemoryRouter initialEntries={initialEntries} initialIndex={0}>
      <ClaimRoutes claim={claim} txId={txId} setClaimTxid={setTxId} />
    </MemoryRouter>
  )
}

const ClaimRoutes = ({
  claim,
  txId,
  setClaimTxid,
}: {
  claim: Claim | undefined
  txId: string
  setClaimTxid: (txId: string) => void
}) => {
  const location = useLocation()
  const queryClient = useQueryClient()
  
  const renderClaimConfirm = useCallback(() => {
    return <ClaimConfirm claim={claim} setClaimTxid={setClaimTxid} />
  }, [claim, setClaimTxid])

  const handleTxConfirmed = useCallback(async () => {
    if (claim?.accountId) {
      await queryClient.invalidateQueries({ queryKey: ['tcy-claims', claim.accountId] })
    }
  }, [claim?.accountId, queryClient])

  const renderClaimStatus = useCallback(() => {
    return (
      <ClaimStatus
        claim={claim}
        txId={txId}
        setClaimTxid={setClaimTxid}
        onTxConfirmed={handleTxConfirmed}
      />
    )
  }, [claim, txId, setClaimTxid, handleTxConfirmed])

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
