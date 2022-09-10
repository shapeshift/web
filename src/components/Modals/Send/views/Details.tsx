import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  Stack,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import isNil from 'lodash/isNil'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { AccountCard } from 'components/AccountCard'
import { Amount } from 'components/Amount/Amount'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { TokenRow } from 'components/TokenRow/TokenRow'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'

import type { SendInput } from '../Form'
import { useSendDetails } from '../hooks/useSendDetails/useSendDetails'
import { SendFormFields, SendRoutes } from '../SendCommon'
import { SendMaxButton } from '../SendMaxButton/SendMaxButton'

export const Details = () => {
  const { control } = useFormContext<SendInput>()
  const history = useHistory()
  const translate = useTranslate()

  const { asset, cryptoAmount, cryptoSymbol, fiatAmount, fiatSymbol, amountFieldError } = useWatch({
    control,
  })

  const { send } = useModal()
  const {
    balancesLoading,
    fieldName,
    cryptoHumanBalance,
    fiatBalance,
    handleNextClick,
    handleSendMax,
    handleInputChange,
    loading,
    toggleCurrency,
  } = useSendDetails()

  const {
    state: { wallet },
  } = useWallet()

  if (
    !(
      asset &&
      asset?.name &&
      !isNil(cryptoAmount) &&
      cryptoSymbol &&
      !isNil(fiatAmount) &&
      fiatSymbol
    )
  ) {
    return null
  }

  return (
    <SlideTransition loading={balancesLoading}>
      <IconButton
        variant='ghost'
        icon={<ArrowBackIcon />}
        aria-label='Back'
        position='absolute'
        top={2}
        left={3}
        fontSize='xl'
        size='sm'
        isRound
        onClick={() => history.push(SendRoutes.Address)}
      />
      <ModalHeader textAlign='center'>
        {translate('modals.send.sendForm.sendAsset', { asset: asset.name })}
      </ModalHeader>
      <ModalCloseButton borderRadius='full' />
      <ModalBody>
        <AccountCard
          // useWatch recursively adds "| undefined" to all fields, which makes the type incompatible
          // So we're going to cast it since we already did a runtime check that the object exists
          asset={asset as Asset}
          isLoaded={!balancesLoading}
          cryptoAmountAvailable={cryptoHumanBalance.toString()}
          fiatAmountAvailable={fiatBalance.toString()}
          showCrypto={fieldName === SendFormFields.CryptoAmount}
          onClick={() => history.push('/send/select')}
          mb={2}
        />
        <FormControl mt={6}>
          <Box display='flex' alignItems='center' justifyContent='space-between'>
            <FormLabel color='gray.500'>{translate('modals.send.sendForm.sendAmount')}</FormLabel>
            <FormHelperText
              mt={0}
              mr={3}
              mb={2}
              as='button'
              type='button'
              color='gray.500'
              onClick={toggleCurrency}
              textTransform='uppercase'
              _hover={{ color: 'gray.400', transition: '.2s color ease' }}
            >
              {fieldName === SendFormFields.FiatAmount ? (
                <Amount.Crypto value={cryptoAmount} symbol={cryptoSymbol} prefix='≈' />
              ) : (
                <Flex>
                  <Amount.Fiat value={fiatAmount} mr={1} prefix='≈' /> {fiatSymbol}
                </Flex>
              )}
            </FormHelperText>
          </Box>
          {fieldName === SendFormFields.CryptoAmount && (
            <TokenRow
              control={control}
              fieldName={SendFormFields.CryptoAmount}
              onInputChange={handleInputChange}
              inputLeftElement={
                <Button
                  ml={1}
                  size='sm'
                  variant='ghost'
                  textTransform='uppercase'
                  onClick={toggleCurrency}
                  width='full'
                >
                  {cryptoSymbol}
                </Button>
              }
              inputRightElement={
                wallet?.getVendor() === 'WalletConnect' ? null : (
                  <SendMaxButton onClick={handleSendMax} />
                )
              }
              rules={{
                required: true,
              }}
              data-test='send-modal-crypto-input'
            />
          )}
          {fieldName === SendFormFields.FiatAmount && (
            <TokenRow
              control={control}
              fieldName={SendFormFields.FiatAmount}
              onInputChange={handleInputChange}
              inputLeftElement={
                <Button
                  ml={1}
                  size='sm'
                  variant='ghost'
                  textTransform='uppercase'
                  onClick={toggleCurrency}
                  width='full'
                  data-test='toggle-currency-button'
                >
                  {fiatSymbol}
                </Button>
              }
              inputRightElement={
                wallet?.getVendor() === 'WalletConnect' ? null : (
                  <SendMaxButton onClick={handleSendMax} />
                )
              }
              rules={{
                required: true,
              }}
              data-test='send-modal-fiat-input'
            />
          )}
        </FormControl>
      </ModalBody>
      <ModalFooter>
        <Stack flex={1}>
          <Button
            width='full'
            isDisabled={!(cryptoAmount ?? fiatAmount) || !!amountFieldError || loading}
            colorScheme={amountFieldError ? 'red' : 'blue'}
            size='lg'
            onClick={handleNextClick}
            isLoading={loading}
            data-test='send-modal-next-button'
          >
            <Text translation={amountFieldError || 'common.next'} />
          </Button>
          <Button width='full' variant='ghost' size='lg' mr={3} onClick={() => send.close()}>
            <Text translation='common.cancel' />
          </Button>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
