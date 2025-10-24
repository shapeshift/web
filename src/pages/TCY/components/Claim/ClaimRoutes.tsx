import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { lazy, useCallback, useMemo, useState } from 'react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { Route, Switch } from 'wouter'

import { TCYClaimRoute } from '../../types'
import type { Claim } from './types'

import { AnimatedSwitch } from '@/components/AnimatedSwitch'
import { useModalRegistration } from '@/context/ModalStackProvider'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { selectPendingTcyClaimActions } from '@/state/slices/actionSlice/selectors'
import { ActionStatus, ActionType } from '@/state/slices/actionSlice/types'
import { useAppDispatch, useAppSelector } from '@/state/store'
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

const ClaimSweep = makeSuspenseful(
  lazy(() =>
    import('./ClaimSweep').then(({ ClaimSweep }) => ({
      default: ClaimSweep,
    })),
  ),
  defaultBoxSpinnerStyle,
)

const initialEntries = [TCYClaimRoute.Confirm, TCYClaimRoute.Status, TCYClaimRoute.Sweep]

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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const dispatch = useAppDispatch()
  const pendingTcyClaimActions = useAppSelector(selectPendingTcyClaimActions)
  const maybePendingAction = useMemo(
    () => pendingTcyClaimActions.find(a => a.id === claim?.l1_address),
    [pendingTcyClaimActions, claim],
  )

  const renderClaimConfirm = useCallback(() => {
    if (!claim) return null

    return <ClaimConfirm claim={claim} setClaimTxid={setClaimTxid} />
  }, [claim, setClaimTxid])

  const handleTxConfirmed = useCallback(async () => {
    if (claim?.accountId) {
      await queryClient.invalidateQueries({ queryKey: ['tcy-claims', claim.accountId] })
      await queryClient.invalidateQueries({ queryKey: ['tcy-staker'] })

      if (!maybePendingAction) return

      const createdAt = maybePendingAction.createdAt ?? Date.now()

      // Dispatch claimed action
      dispatch(
        actionSlice.actions.upsertAction({
          id: claim.l1_address,
          status: ActionStatus.Claimed,
          type: ActionType.TcyClaim,
          createdAt,
          updatedAt: Date.now(),
          tcyClaimActionMetadata: {
            claim,
            txHash: txId,
          },
        }),
      )
    }
  }, [claim, txId, queryClient, dispatch, maybePendingAction])

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

  const handleSweepSeen = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['isSweepNeeded'] })
    navigate(TCYClaimRoute.Confirm, { state: { selectedClaim: claim } })
  }, [navigate, queryClient, claim])

  const handleSweepBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  const renderClaimSweep = useCallback(() => {
    if (!claim) return null

    return <ClaimSweep claim={claim} onBack={handleSweepBack} onSweepSeen={handleSweepSeen} />
  }, [claim, handleSweepBack, handleSweepSeen])

  return (
    <AnimatedSwitch>
      <Switch location={location.pathname}>
        <Route path={TCYClaimRoute.Confirm}>{renderClaimConfirm()}</Route>
        <Route path={TCYClaimRoute.Status}>{renderClaimStatus()}</Route>
        <Route path={TCYClaimRoute.Sweep}>{renderClaimSweep()}</Route>
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
  const { modalProps, overlayProps, modalContentProps } = useModalRegistration({
    isOpen,
    onClose,
  })

  return (
    <Modal {...modalProps}>
      <ModalOverlay {...overlayProps} />
      <ModalContent {...modalContentProps}>
        <ClaimContent claim={claim} />
      </ModalContent>
    </Modal>
  )
}
