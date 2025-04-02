import { AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'

import { SnapConfirm } from './SnapConfirm'
import { SnapIntro } from './SnapIntro'

// Replace redirect with a component
const IntroRedirect = () => <Navigate to='/intro' replace />

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
  const snapIntroElement = useMemo(
    () => (
      <SnapIntro
        isRemoved={isRemoved}
        isCorrectVersion={isCorrectVersion}
        isSnapInstalled={isSnapInstalled}
      />
    ),
    [isRemoved, isCorrectVersion, isSnapInstalled],
  )

  const snapConfirmElement = useMemo(() => <SnapConfirm onClose={onClose} />, [onClose])
  const introRedirectElement = useMemo(() => <IntroRedirect />, [])

  return (
    <MemoryRouter>
      <AnimatePresence mode='wait' initial={false}>
        <Routes>
          <Route path='/intro' element={snapIntroElement} />
          <Route path='/confirm' element={snapConfirmElement} />
          <Route path='/' element={introRedirectElement} />
        </Routes>
      </AnimatePresence>
    </MemoryRouter>
  )
}
