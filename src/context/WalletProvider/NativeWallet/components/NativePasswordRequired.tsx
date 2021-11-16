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
  ModalOverlay,
  useDisclosure
} from '@chakra-ui/react'
import { NativeEvents, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useEffect, useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { Text } from 'components/Text'
import { KeyManager, SUPPORTED_WALLETS } from 'context/WalletProvider/config'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'

export const NativePasswordRequired = ({
  onConnect
}: {
  onConnect: (wallet: NativeHDWallet) => void
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [wallet, setWallet] = useState<NativeHDWallet | null>(null)
  const [showPw, setShowPw] = useState<boolean>(false)
  const { state, dispatch } = useWallet()

  const handleShowClick = () => setShowPw(!showPw)
  const onSubmit = async (values: FieldValues) => {
    // @TODO: Grab the wallet that emitted the event by deviceId
    try {
      // @TODO: Replace this encryption with a most robust method
      const vault = await Vault.thereCanBeOnlyOne(values.password)
      const deviceId = vault.id
      const maybeWallet: NativeHDWallet | null = state.keyring.get(deviceId)
      if (maybeWallet) {
        await maybeWallet.loadDevice({
          mnemonic: await vault.get('#mnemonic'),
          deviceId
        })
        const { name, icon } = SUPPORTED_WALLETS[KeyManager.Native]
        dispatch({
          type: WalletActions.SET_WALLET,
          payload: {
            wallet: maybeWallet,
            name,
            icon,
            deviceId
          }
        })
        setWallet(maybeWallet)
      }
    } catch (e) {
      console.error('storedWallets', e)
      setError('password', { message: 'Invalid password' })
    }
  }

  const {
    handleSubmit,
    register,
    setError,
    clearErrors,
    formState: { errors, isSubmitting }
  } = useForm()

  useEffect(() => {
    if (!state.adapters?.has(KeyManager.Native)) return
    ;(async () => {
      for (const deviceId of await Vault.list()) {
        try {
          const device = await state.adapters?.get(KeyManager.Native)?.pairDevice(deviceId)
          await device?.initialize()
          console.info('Found native wallet', deviceId)
        } catch (e) {
          console.error('Error pairing native wallet', deviceId)
        }
      }
    })()
  }, [state.adapters])

  useEffect(() => {
    if (state.keyring) {
      state.keyring.on(['Native', '*', NativeEvents.MNEMONIC_REQUIRED], onOpen)
      state.keyring.on(['Native', '*', NativeEvents.READY], () => {
        clearErrors()
        onClose()
        // safe to non-null assert here as the wallet as emitted a ready event
        onConnect(wallet!)
      })
    }
    return () => {
      state.keyring.off(NativeEvents.MNEMONIC_REQUIRED, onOpen)
      state.keyring.off(NativeEvents.READY, () => {
        clearErrors()
        onClose()
        // safe to non-null assert here as the wallet as emitted a ready event
        onConnect(wallet!)
      })
    }
    // We don't want to add a bunch of event listeners by re-rendering this effect
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [state.keyring, wallet])

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
        <Flex justifyContent='space-between' alignItems='center' position='relative'>
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
              <FormErrorMessage>{errors?.password?.message}</FormErrorMessage>
            </FormControl>
            <Button colorScheme='blue' size='lg' isFullWidth type='submit' isLoading={isSubmitting}>
              <Text translation={'walletProvider.shapeShift.nativePassReq.button'} />
            </Button>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
