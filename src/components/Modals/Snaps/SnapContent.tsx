import { AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'

import { SnapConfirm } from './SnapConfirm'
import { SnapIntro } from './SnapIntro'

const introRedirect = <Navigate to='/intro' replace />

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
  const introRedirect = useMemo(() => <introRedirect />, [])

  return (
    <MemoryRouter>
      <AnimatePresence mode='wait' initial={false}>
        <Routes>
          <Route path='/intro' element={snapIntro} />
          <Route path='/confirm' element={snapConfirm} />
          <Route path='/' element={introRedirect} />
        </Routes>
      </AnimatePresence>
    </MemoryRouter>
  )
}
