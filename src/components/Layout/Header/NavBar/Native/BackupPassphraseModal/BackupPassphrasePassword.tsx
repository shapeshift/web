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
import { useCallback, useMemo, useState } from 'react'
import type { FieldValues } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { FaEye, FaEyeSlash, FaWallet } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import type { LocationState } from './BackupPassphraseCommon'
import { BackupPassphraseRoutes } from './BackupPassphraseCommon'

import { IconCircle } from '@/components/IconCircle'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText, Text } from '@/components/Text'
import type { NativeWalletValues } from '@/context/WalletProvider/NativeWallet/types'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'

const buttonLeftIcon = (
  <IconCircle boxSize={10}>
    <FaWallet />
  </IconCircle>
)

/**
 * This component only works for ShapeShift wallets encrypted using hdwallet Vault
 */
export const BackupPassphrasePassword: React.FC<LocationState> = props => {
  const { revocableWallet } = props
  const translate = useTranslate()
  const navigate = useNavigate()
  const { state } = useWallet()
  const { walletInfo } = state

  const { props: backupNativePassphraseProps } = useModal('backupNativePassphrase')
  const preventClose = backupNativePassphraseProps?.preventClose

  const [showPw, setShowPw] = useState<boolean>(false)

  const {
    setError,
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<NativeWalletValues>({ mode: 'onChange', shouldUnregister: true })

  const handleShowClick = useCallback(() => setShowPw(!showPw), [showPw])
  const onSubmit = useCallback(
    async (values: FieldValues) => {
      const Vault = await import('@shapeshiftoss/hdwallet-native-vault').then(m => m.Vault)
      try {
        const vault = await Vault.open(walletInfo?.deviceId, values.password, false)
        revocableWallet.mnemonic = await vault.unwrap().get('#mnemonic')
        vault.seal()
        navigate(BackupPassphraseRoutes.Info)
      } catch (e) {
        console.error(e)
        setError(
          'password',
          {
            type: 'manual',
            message: translate('modals.shapeShift.password.error.invalid'),
          },
          { shouldFocus: true },
        )
      }
    },
    [navigate, revocableWallet, setError, translate, walletInfo?.deviceId],
  )

  const handleFormSubmit = useMemo(() => handleSubmit(onSubmit), [handleSubmit, onSubmit])
  const handleClick = useCallback(() => {}, [])

  return (
    <>
      <ModalHeader>
        <Text translation={'modals.shapeShift.backupPassphrase.enterPassword'} />
      </ModalHeader>
      {!preventClose && <ModalCloseButton />}
      <ModalBody>
        <SlideTransition>
          <Button
            px={4}
            variant='unstyled'
            display='flex'
            mb={4}
            leftIcon={buttonLeftIcon}
            onClick={handleClick}
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
          <form onSubmit={handleFormSubmit}>
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
        </SlideTransition>
      </ModalBody>
    </>
  )
}
