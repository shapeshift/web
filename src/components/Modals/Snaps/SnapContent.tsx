import { AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'
import { MemoryRouter, Navigate, useLocation } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import { SnapConfirm } from './SnapConfirm'
import { SnapIntro } from './SnapIntro'

const introRedirect = <Navigate to='/intro' replace />

export const SnapContentRouter = (props: {
  isRemoved?: boolean
  isCorrectVersion: boolean
  isSnapInstalled: boolean
  onClose: () => void
}) => {
  return (
    <MemoryRouter>
      <SnapContent {...props} />
    </MemoryRouter>
  )
}

export const SnapContent = ({
  isRemoved,
  isCorrectVersion,
  isSnapInstalled,
  onClose,
}: {
  isRemoved?: boolean
  isCorrectVersion: boolean
  isSnapInstalled: boolean
  onClose: () => void
}) => {
  const location = useLocation()
  const snapIntro = useMemo(
    () => (
      <SnapIntro
        isRemoved={isRemoved}
        isCorrectVersion={isCorrectVersion}
        isSnapInstalled={isSnapInstalled}
      />
    ),
    [isRemoved, isCorrectVersion, isSnapInstalled],
  )

  const snapConfirm = useMemo(() => <SnapConfirm onClose={onClose} />, [onClose])

  return (
    <AnimatePresence mode='wait' initial={false}>
      <Switch location={location.pathname}>
        <Route path='/intro'>{snapIntro}</Route>
        <Route path='/confirm'>{snapConfirm}</Route>
        <Route path='/'>{introRedirect}</Route>
      </Switch>
    </AnimatePresence>
  )
}
