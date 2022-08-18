import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  ModalBody,
  ModalCloseButton,
  ModalHeader,
} from '@chakra-ui/react'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { FaEye, FaEyeSlash, FaWallet } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { IconCircle } from 'components/IconCircle'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { NativeWalletValues } from 'context/WalletProvider/NativeWallet/types'
import { useWallet } from 'hooks/useWallet/useWallet'

import { BackupPassphraseRoutes } from './BackupPassphraseCommon'

export const BackupPassphrasePassword = ({ setVault }: { setVault: (vault: Vault) => void }) => {
  const translate = useTranslate()
  const { state } = useWallet()
  const { walletInfo } = state
  const history = useHistory()

  const [showPw, setShowPw] = useState<boolean>(false)

  const {
    setError,
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<NativeWalletValues>({ mode: 'onChange', shouldUnregister: true })

  const handleShowClick = () => setShowPw(!showPw)
  const onSubmit = async (values: FieldValues) => {
    try {
      const vault = await Vault.open(walletInfo?.deviceId, values.password, false)
      setVault(vault)
      history.push(BackupPassphraseRoutes.Info)
    } catch (e) {
      console.info(e)
      setError(
        'password',
        {
          type: 'manual',
          message: translate('modals.shapeShift.password.error.invalid'),
        },
        { shouldFocus: true },
      )
    }
  }

  return (
    <SlideTransition>
      <ModalHeader>
        <Text translation={'modals.shapeShift.backupPassphrase.enterPassword'} />
      </ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <Button
          px={4}
          variant='unstyled'
          display='flex'
          mb={4}
          leftIcon={
            <IconCircle boxSize={10}>
              <FaWallet />
            </IconCircle>
          }
          onClick={() => {}}
          data-test='native-saved-wallet-button'
        >
          <Box textAlign='left'>
            <RawText
              fontWeight='medium'
              maxWidth='260px'
              lineHeight='1.2'
              mb={1}
              noOfLines={1}
              data-test='native-saved-wallet-name'
            >
              {walletInfo?.meta?.label}
            </RawText>
          </Box>
        </Button>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormControl isInvalid={Boolean(errors.password)} mb={6}>
            <InputGroup size='lg' variant='filled'>
              <Input
                {...register('password', {
                  required: translate('modals.shapeShift.password.error.required'),
                  minLength: {
                    value: 8,
                    message: translate('modals.shapeShift.password.error.length', { length: 8 }),
                  },
                })}
                pr='4.5rem'
                type={showPw ? 'text' : 'password'}
                placeholder={translate('modals.shapeShift.password.placeholder')}
                autoComplete={'password'}
                id='password'
                data-test='wallet-password-input'
              />
              <InputRightElement>
                <IconButton
                  aria-label={translate(`modals.shapeShift.password.${showPw ? 'hide' : 'show'}`)}
                  h='1.75rem'
                  size='sm'
                  onClick={handleShowClick}
                  icon={!showPw ? <FaEye /> : <FaEyeSlash />}
                />
              </InputRightElement>
            </InputGroup>
            <FormErrorMessage>{errors?.password?.message}</FormErrorMessage>
          </FormControl>
          <Button
            colorScheme='blue'
            size='lg'
            width='full'
            type='submit'
            isLoading={isSubmitting}
            data-test='wallet-password-submit-button'
          >
            <Text translation={'walletProvider.shapeShift.password.button'} />
          </Button>
        </form>
      </ModalBody>
    </SlideTransition>
  )
}
