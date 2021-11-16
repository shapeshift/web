import {
  Button,
  FormControl,
  FormErrorMessage,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  ModalBody,
  ModalHeader
} from '@chakra-ui/react'
import { useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { RouteComponentProps } from 'react-router-dom'
import { Text } from 'components/Text'

export const NativePassword = ({ history }: RouteComponentProps) => {
  const [showPw, setShowPw] = useState<boolean>(false)
  const { state } = useLocation<LocationState>()

  const handleShowClick = () => setShowPw(!showPw)
  const onSubmit = async (values: FieldValues) => {
    const vault = await location.state.vault.setPassword(values.password)
    history.push('/native/start', { vault })
  }

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting }
  } = useForm()

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.nativePasswd.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={6} color='gray.500' translation={'walletProvider.shapeShift.nativePasswd.body'} />
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormControl isInvalid={errors.name} mb={6}>
            <InputGroup size='lg' variant='filled'>
              <Input
                {...register('password', {
                  required: 'This is required',
                  minLength: { value: 8, message: 'Minimum length should be 8' }
                })}
                pr='4.5rem'
                type={showPw ? 'text' : 'password'}
                placeholder='Enter password'
                id='password'
              />
              <InputRightElement>
                <IconButton
                  aria-label={!showPw ? 'Show password' : 'Hide password'}
                  h='1.75rem'
                  size='sm'
                  onClick={handleShowClick}
                  icon={!showPw ? <FaEye /> : <FaEyeSlash />}
                />
              </InputRightElement>
            </InputGroup>
            <FormErrorMessage>{errors.name && errors.name.message}</FormErrorMessage>
          </FormControl>
          <Button colorScheme='blue' size='lg' isFullWidth type='submit' isLoading={isSubmitting}>
            <Text translation={'walletProvider.shapeShift.nativePasswd.button'} />
          </Button>
        </form>
      </ModalBody>
    </>
  )
}
