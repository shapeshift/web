import { WarningIcon } from '@chakra-ui/icons'
import { Alert, AlertDescription, Button, Heading, Stack, Text } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { useHistory, useLocation } from 'react-router'
import { DialogBackButton } from 'components/Modal/components/DialogBackButton'
import { DialogBody } from 'components/Modal/components/DialogBody'
import { DialogFooter } from 'components/Modal/components/DialogFooter'
import {
  DialogHeader,
  DialogHeaderLeft,
  DialogHeaderMiddle,
} from 'components/Modal/components/DialogHeader'
import { DialogTitle } from 'components/Modal/components/DialogTitle'
import { SlideTransition } from 'components/SlideTransition'
import { deleteWallet } from 'context/WalletProvider/MobileWallet/mobileMessageHandlers'
import type { MobileLocationState } from 'context/WalletProvider/MobileWallet/types'
import { WalletCard } from 'pages/ConnectWallet/components/WalletCard'

import { MobileWalletDialogRoutes } from '../types'

export const DeleteWallet = () => {
  const location = useLocation<MobileLocationState>()
  const history = useHistory()
  const [error, setError] = useState<string | null>(null)

  const handleBack = useCallback(() => {
    history.push(MobileWalletDialogRoutes.SAVED)
  }, [history])

  const handleDelete = useCallback(async () => {
    if (location.state.vault?.id) {
      try {
        await deleteWallet(location.state.vault.id)
        history.push(MobileWalletDialogRoutes.SAVED)
      } catch (e) {
        console.log(e)
        setError('walletProvider.shapeShift.load.error.delete')
      }
    }
  }, [history, location.state.vault?.id])
  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeaderLeft>
          <DialogBackButton onClick={handleBack} />
        </DialogHeaderLeft>
        <DialogHeaderMiddle>
          <DialogTitle>Forget wallet</DialogTitle>
        </DialogHeaderMiddle>
      </DialogHeader>
      <DialogBody>
        <Stack mb={4}>
          <WarningIcon color='text.warning' boxSize='48px' mx='auto' />
          <Heading size='md' textAlign='center' maxWidth='250px' mx='auto'>
            Are you sure you want to forget this wallet?
          </Heading>
          <Text textAlign='center' maxWidth='300px' mx='auto' mb={6}>
            You will no longer be able to access this wallet, in the app.
          </Text>
          {location.state.vault && <WalletCard wallet={location.state.vault} />}
        </Stack>
      </DialogBody>
      <DialogFooter>
        {error && (
          <Alert status='error'>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button size='lg' colorScheme='blue' width='full' onClick={handleDelete}>
          Yes, forget wallet
        </Button>
      </DialogFooter>
    </SlideTransition>
  )
}
