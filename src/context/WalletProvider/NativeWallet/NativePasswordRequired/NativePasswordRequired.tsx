import {
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay
} from '@chakra-ui/react'
import { Text } from 'components/Text'
import { useForm } from 'react-hook-form'
import { FaEye, FaEyeSlash } from 'react-icons/fa'

import { useInitializeWalletFromStorage } from './hooks/useInitializeWalletFromStorage/useInitializeWalletFromStorage'
import { useNativePasswordRequired } from './hooks/useNativePasswordRequired/useNativePasswordRequired'
import { useStateToggle } from './hooks/useStateToggle/useStateToggle'

export const NativePasswordRequired = () => {
  const [showPw, toggleShowPw] = useStateToggle()
  const {
    handleSubmit,
    register,
    setError,
    clearErrors,
    formState: { errors, isSubmitting }
  } = useForm()
  const { onSubmit, isOpen, onClose } = useNativePasswordRequired({ setError, clearErrors })
  useInitializeWalletFromStorage()

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <Flex justifyContent='spacebetween' alignItems='center' position='relative'>
          <ModalCloseButton ml='auto' borderRadius='full' position='static' />
        </Flex>
        <ModalHeader>
          <Text translation={'walletProvider.shapeShift.nativePassReq.header'} />
        </ModalHeader>
        <ModalBody>
          <Text
            mb={6}
            color='gray.500'
            translation={'walletProvider.shapeShift.nativePassReq.body'}
          />
          <form onSubmit={handleSubmit(onSubmit)}>
            <FormControl isInvalid={errors.password} mb={6}>
              <InputGroup size='lg' variant='filled'>
                <Input
                  {...register('password', {
                    required: 'This is required',
                    minLength: { value: 8, message: 'Minimum length should be 8' }
                  })}
                  pr='4.5rem'
                  type={showPw ? 'text' : 'password'}
                  placeholder='Enter password'
                />
                <InputRightElement>
                  <IconButton
                    aria-label={!showPw ? 'Show password' : 'Hide password'}
                    h='1.75rem'
                    size='sm'
                    onClick={toggleShowPw}
                    icon={!showPw ? <FaEye /> : <FaEyeSlash />}
                  />
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage>{errors?.password?.message}</FormErrorMessage>
            </FormControl>
            <Button
              colorScheme='blue'
              size='lg'
              isFullWidth
              type='submit'
              isLoading={isSubmitting}
              mb={6}
            >
              <Text translation={'walletProvider.shapeShift.nativePassReq.button'} />
            </Button>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
