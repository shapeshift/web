import {
  Button,
  FormControl,
  FormErrorMessage,
  Input,
  ModalBody,
  ModalHeader,
} from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useLocation, useNavigate } from 'react-router'

import { updateWallet } from '../mobileMessageHandlers'

import { Text } from '@/components/Text'

const isValidLabel = (label: unknown): label is string => {
  return typeof label === 'string' && label.length > 0 && label.length < 65
}

export const MobileRename = () => {
  const location = useLocation()
  const navigate = useNavigate()
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
        navigate(-1)
      } else {
        setError(translate('modals.shapeShift.password.error.maxLength'))
      }
    } catch (e) {
      console.log(e)
    } finally {
      setIsSubmitting(false)
    }
  }, [navigate, label, location.state.vault?.id, translate])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value),
    [],
  )

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
            onChange={handleChange}
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
