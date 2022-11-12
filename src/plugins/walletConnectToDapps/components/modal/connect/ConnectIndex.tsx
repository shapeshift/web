import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  Link,
  VStack,
} from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { FaQrcode } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'
import {
  selectAccountNumberByAccountId,
  selectFirstAccountIdByChainId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AccountButton } from './AccountButton'
import { ConnectRoutes } from './ConnectCommon'

type FormValues = {
  uri: string
}

export const ConnectIndex = ({
  handleConnect,
  account,
}: {
  handleConnect: (uri: string) => Promise<void>
  account: AccountId | null
}) => {
  const translate = useTranslate()
  const history = useHistory()
  const {
    state: { wallet },
  } = useWallet()
  const firstAccount = useAppSelector(s => selectFirstAccountIdByChainId(s, ethChainId))
  const selectedAccount = account ?? firstAccount
  const filter = useMemo(() => ({ accountId: selectedAccount ?? '' }), [selectedAccount])
  const accountNumber = useAppSelector(state => selectAccountNumberByAccountId(state, filter))

  const handleForm = (values: FormValues) => handleConnect(values.uri)

  const { register, handleSubmit, control, formState } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: { uri: '' },
  })
  const canConnect = !!useWatch({ control, name: 'uri' })

  const isMultiAccountEnabled = useFeatureFlag('MultiAccounts')
  const canShowAccountSelection = useMemo(
    () => isMultiAccountEnabled && wallet?.supportsBip44Accounts() && selectedAccount,
    [isMultiAccountEnabled, wallet, selectedAccount],
  )

  return (
    <SlideTransition>
      <Box p={8}>
        <form onSubmit={handleSubmit(handleForm)}>
          <VStack spacing={8}>
            <WalletConnectIcon fontSize='9xl' />
            <Heading flex={1} fontSize='xl'>
              <Text translation='plugins.walletConnectToDapps.modal.connect.title' />
            </Heading>
            <Link href='#' target='_blank'>
              <Button colorScheme='blue' variant='link'>
                {translate('plugins.walletConnectToDapps.modal.connect.howTo')}
              </Button>
            </Link>

            <FormControl isInvalid={Boolean(formState.errors.uri)} mb={6}>
              {canShowAccountSelection && (
                <AccountButton
                  accountIds={[selectedAccount!]}
                  accountNumber={accountNumber ?? 0}
                  onClick={() => history.push(ConnectRoutes.Accounts)}
                  buttonProps={{ mb: 4 }}
                />
              )}
              <InputGroup size='lg'>
                <InputRightElement pointerEvents='none'>
                  <FaQrcode color='gray.300' />
                </InputRightElement>
                <Input
                  {...register('uri')}
                  autoComplete={'off'}
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
      </Box>
    </SlideTransition>
  )
}
