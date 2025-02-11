import { WarningIcon } from '@chakra-ui/icons'
import { Alert, AlertDescription, Button, Heading, Stack, Text } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { DialogBackButton } from 'components/Modal/components/DialogBackButton'
import { DialogBody } from 'components/Modal/components/DialogBody'
import { DialogFooter } from 'components/Modal/components/DialogFooter'
import { DialogHeader, DialogHeaderLeft } from 'components/Modal/components/DialogHeader'
import { SlideTransition } from 'components/SlideTransition'
import { deleteWallet } from 'context/WalletProvider/MobileWallet/mobileMessageHandlers'
import type { RevocableWallet } from 'context/WalletProvider/MobileWallet/RevocableWallet'
import { useWallet } from 'hooks/useWallet/useWallet'
import { WalletCard } from 'pages/ConnectWallet/components/WalletCard'
import { portfolio } from 'state/slices/portfolioSlice/portfolioSlice'
import { useAppDispatch } from 'state/store'

type ConfirmDeleteProps = {
  vault: RevocableWallet
  onBack: () => void
}

export const ConfirmDelete: React.FC<ConfirmDeleteProps> = ({ vault, onBack }) => {
  const [error, setError] = useState<string | null>(null)
  const translate = useTranslate()
  const { disconnect, state } = useWallet()
  const appDispatch = useAppDispatch()

  const handleDelete = useCallback(async () => {
    if (vault?.id) {
      try {
        await deleteWallet(vault.id)

        appDispatch(portfolio.actions.clearWalletPortfolioState(vault.id))

        if (state.walletInfo?.deviceId === vault.id) {
          disconnect()
        }
        onBack()
      } catch (e) {
        console.log(e)
        setError('walletProvider.shapeShift.load.error.delete')
      }
    }
  }, [onBack, disconnect, state.walletInfo?.deviceId, appDispatch, vault])

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeaderLeft>
          <DialogBackButton onClick={onBack} />
        </DialogHeaderLeft>
      </DialogHeader>
      <DialogBody>
        <Stack mb={4}>
          <WarningIcon color='text.error' boxSize='48px' mx='auto' />
          <Heading size='md' textAlign='center' maxWidth='250px' mx='auto'>
            {translate('walletProvider.shapeShift.load.confirmForget', { wallet: vault?.label })}
          </Heading>
          <Text textAlign='center' maxWidth='300px' mx='auto' mb={6} color='text.subtle'>
            {translate('walletProvider.shapeShift.load.confirmForgetBody')}
          </Text>
          <WalletCard wallet={vault} id={vault.id} />
        </Stack>
      </DialogBody>
      <DialogFooter flexDir='column' gap={2}>
        {error && (
          <Alert status='error'>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button size='lg' colorScheme='red' width='full' onClick={handleDelete}>
          {translate('walletProvider.shapeShift.load.forgetWallet')}
        </Button>
      </DialogFooter>
    </SlideTransition>
  )
}
