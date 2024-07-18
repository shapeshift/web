import { Button, FormControl, FormErrorMessage, Input } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
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
import { Text } from 'components/Text'
import { updateWallet } from 'context/WalletProvider/MobileWallet/mobileMessageHandlers'
import type { MobileLocationState } from 'context/WalletProvider/MobileWallet/types'

import { MobileWalletDialogRoutes } from '../types'

const isValidLabel = (label: unknown): label is string => {
  return typeof label === 'string' && label.length > 0 && label.length < 65
}

export const RenameWallet = () => {
  const location = useLocation<MobileLocationState>()
  const history = useHistory()
  const translate = useTranslate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [label, setLabel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleClick = useCallback(async () => {
    setIsSubmitting(true)
    try {
      if (
        isValidLabel(label) &&
        location.state.vault?.id &&
        // Ask the mobile app to update the label on the wallet
        (await updateWallet(location.state.vault.id, { label }))
      ) {
        history.goBack()
      } else {
        setError(translate('modals.shapeShift.password.error.maxLength'))
      }
    } catch (e) {
      console.log(e)
    } finally {
      setIsSubmitting(false)
    }
  }, [history, label, location.state.vault?.id, translate])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value),
    [],
  )

  const handleBack = useCallback(() => history.push(MobileWalletDialogRoutes.SAVED), [history])

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeaderLeft>
          <DialogBackButton onClick={handleBack} />
        </DialogHeaderLeft>
        <DialogHeaderMiddle>
          <DialogTitle>{translate('walletProvider.shapeShift.rename.header')}</DialogTitle>
        </DialogHeaderMiddle>
      </DialogHeader>
      <DialogBody>
        <Text mb={6} color='text.subtle' translation={'walletProvider.shapeShift.rename.body'} />
        <FormControl mb={6} isInvalid={Boolean(error)}>
          <Input
            size='lg'
            variant='filled'
            id='name'
            placeholder={translate('walletProvider.shapeShift.rename.walletName')}
            onChange={handleChange}
          />
          <FormErrorMessage>{error}</FormErrorMessage>
        </FormControl>
      </DialogBody>
      <DialogFooter pt={4}>
        <Button
          colorScheme='blue'
          size='lg'
          width='full'
          type='submit'
          isLoading={isSubmitting}
          isDisabled={Boolean(error) || !label || isSubmitting}
          onClick={handleClick}
        >
          <Text translation={'walletProvider.shapeShift.rename.button'} />
        </Button>
      </DialogFooter>
    </SlideTransition>
  )
}
