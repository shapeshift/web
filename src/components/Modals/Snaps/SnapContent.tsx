import { AnimatePresence } from 'framer-motion'
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
  return (
    <MemoryRouter>
      <AnimatePresence mode='wait' initial={false}>
        <Routes>
          <Route 
            path='/intro' 
            element={
              <SnapIntro
                isRemoved={isRemoved}
                isCorrectVersion={isCorrectVersion}
                isSnapInstalled={isSnapInstalled}
              />
            } 
          />
          <Route path='/confirm' element={<SnapConfirm onClose={onClose} />} />
          <Route path='/' element={<IntroRedirect />} />
        </Routes>
      </AnimatePresence>
    </MemoryRouter>
  )
}
