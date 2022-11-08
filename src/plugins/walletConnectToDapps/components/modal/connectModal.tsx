import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import {
  Button,
  FormControl,
  FormErrorMessage,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  ModalCloseButton,
  VStack,
} from '@chakra-ui/react'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import type { FC } from 'react'
import { useEffect } from 'react'
import { useCallback } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { FaQrcode } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { Text } from 'components/Text'

type Props = {
  isOpen: boolean
  onClose(): void
}

type FormValues = {
  uri: string
}

export const ConnectModal: FC<Props> = ({ isOpen, onClose }) => {
  const translate = useTranslate()

  const { register, handleSubmit, control, formState, setValue } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: { uri: '' },
  })
  const canConnect = !!useWatch({ control, name: 'uri' })

  const { connect } = useWalletConnect()
  const handleConnect = useCallback(
    async (values: FormValues) => {
      await connect(values.uri)
      onClose()
    },
    [connect, onClose],
  )

  useEffect(() => {
    if (!isOpen) return
    // @ts-ignore
    navigator.clipboard.read().then(async data => {
      const link = await data[0].getType('text/plain')
      link.text().then(uri => {
        if (uri.startsWith('wc:')) setValue('uri', uri)
      })
    })
  }, [isOpen, setValue])

  return (
    <Modal isOpen={isOpen} onClose={onClose} variant='header-nav'>
      <ModalOverlay />

      <ModalContent
        width='full'
        textAlign='center'
        p={8}
        borderRadius={{ base: 0, md: 'xl' }}
        minWidth={{ base: '100%', md: '500px' }}
        maxWidth={{ base: 'full', md: '500px' }}
      >
        <ModalCloseButton position='absolute' color='gray.500' />

        <form onSubmit={handleSubmit(handleConnect)}>
          <VStack spacing={8}>
            <WalletConnectIcon fontSize='9xl' />
            <Heading flex={1} fontSize='xl'>
              <Text translation='plugins.walletConnectToDapps.modal.connect.title' />
            </Heading>
            {/* TODO: Make youtube video and link it here
            <Button colorScheme='blue' as={Link} variant='link' href="" isExternal>
              {translate('plugins.walletConnectToDapps.modal.connect.howTo')}
            </Button> */}
            <FormControl isInvalid={Boolean(formState.errors.uri)} mb={6}>
              <InputGroup size='lg'>
                <InputRightElement pointerEvents='none'>
                  <FaQrcode color='gray.300' />
                </InputRightElement>
                <Input
                  {...register('uri')}
                  type='text'
                  placeholder={translate(
                    'plugins.walletConnectToDapps.modal.connect.linkPlaceholder',
                  )}
                  autoFocus // eslint-disable-line jsx-a11y/no-autofocus
                  variant='filled'
                />
              </InputGroup>
              <FormErrorMessage>{formState.errors?.uri?.message}</FormErrorMessage>
            </FormControl>
            <Button
              isDisabled={!canConnect}
              colorScheme='blue'
              size='lg'
              width='full'
              type='submit'
              variant='solid'
              isLoading={formState.isSubmitting}
            >
              {translate('plugins.walletConnectToDapps.modal.connect.connect')}
            </Button>
          </VStack>
        </form>
      </ModalContent>
    </Modal>
  )
}
