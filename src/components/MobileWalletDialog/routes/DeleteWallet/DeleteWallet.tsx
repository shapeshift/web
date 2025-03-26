import { ArrowBackIcon } from '@chakra-ui/icons'
import { Button, DialogBody, Heading, IconButton } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ConfirmDelete } from './ConfirmDelete'

import { MobileWalletDialogRoutes } from '@/components/MobileWalletDialog/config'
import { SlideTransition } from '@/components/SlideTransition'
import { useWallet } from '@/hooks/useWallet/useWallet'
import type { MobileLocationState } from '@/context/WalletProvider/MobileWallet/types'

const ConfirmDeleteRedirect = () => <Navigate to={MobileWalletDialogRoutes.ConfirmDelete} replace />

export const DeleteWallet = () => {
  const {
    state: { vault },
  } = useLocation<MobileLocationState>()
  const navigate = useNavigate()
  const translate = useTranslate()

  const handleBack = useCallback(() => {
    navigate(MobileWalletDialogRoutes.Saved)
  }, [history])

  if (!vault)
    return (
      <SlideTransition>
        <DialogBody>
          <Heading size='md' textAlign='center' maxWidth='250px' mx='auto'>
            {translate('common.somethingWentWrong')}
          </Heading>
          <Button onClick={handleBack} mx='auto'>
            {translate('common.goBack')}
          </Button>
        </DialogBody>
      </SlideTransition>
    )

  return (
    <SlideTransition>
      <MemoryRouter>
        <AnimatePresence mode='wait' initial={false}>
          <Routes>
            <Route 
              path={MobileWalletDialogRoutes.ConfirmDelete} 
              element={<ConfirmDelete vault={vault} onBack={handleBack} />} 
            />
            <Route path='/' element={<ConfirmDeleteRedirect />} />
          </Routes>
        </AnimatePresence>
      </MemoryRouter>
    </SlideTransition>
  )
}
