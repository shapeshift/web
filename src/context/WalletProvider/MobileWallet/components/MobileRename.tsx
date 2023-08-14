import {
  Button,
  FormControl,
  FormErrorMessage,
  Input,
  ModalBody,
  ModalHeader,
} from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'

import { updateWallet } from '../mobileMessageHandlers'
import type { MobileSetupProps } from '../types'

const isValidLabel = (label: unknown): label is string => {
  return typeof label === 'string' && label.length > 0 && label.length < 65
}

export const MobileRename = ({ history, location }: MobileSetupProps) => {
  const translate = useTranslate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [label, setLabel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
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
  }

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.rename.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={6} color='text.subtle' translation={'walletProvider.shapeShift.rename.body'} />
        <FormControl mb={6} isInvalid={Boolean(error)}>
          <Input
            size='lg'
            variant='filled'
            id='name'
            placeholder={translate('walletProvider.shapeShift.rename.walletName')}
            onChange={e => setLabel(e.target.value)}
          />
          <FormErrorMessage>{error}</FormErrorMessage>
        </FormControl>
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
      </ModalBody>
    </>
  )
}
