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
  Stack
} from '@chakra-ui/react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { AccountCard } from 'components/AccountCard'
import { Amount } from 'components/Amount/Amount'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { TokenRow } from 'components/TokenRow/TokenRow'
import { useModal } from 'context/ModalProvider/ModalProvider'

import { SendFormFields } from '../Form'
import { useSendDetails } from '../hooks/useSendDetails/useSendDetails'
import { SendRoutes } from '../Send'
import { SendMaxButton } from '../SendMaxButton/SendMaxButton'

export const Details = () => {
  const {
    control,
    formState: { isValid }
  } = useFormContext()
  const history = useHistory()
  const translate = useTranslate()

  const [asset, crypto, fiat] = useWatch({
    name: [SendFormFields.Asset, SendFormFields.Crypto, SendFormFields.Fiat]
  })

  const { send } = useModal()
  const {
    amountFieldError,
    balancesLoading,
    fieldName,
    accountBalances,
    handleInputChange,
    handleNextClick,
    handleSendMax,
    loading,
    toggleCurrency,
    validateCryptoAmount,
    validateFiatAmount
  } = useSendDetails()

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
          asset={asset}
          isLoaded={!balancesLoading}
          cryptoAmountAvailable={accountBalances.crypto.toString()}
          fiatAmountAvailable={accountBalances.fiat.toString()}
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
                <Amount.Crypto value={crypto.amount} symbol={crypto.symbol} prefix='≈' />
              ) : (
                <Flex>
                  <Amount.Fiat value={fiat.amount} mr={1} prefix='≈' /> {fiat.symbol}
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
                  {crypto.symbol}
                </Button>
              }
              inputRightElement={<SendMaxButton onClick={handleSendMax} />}
              rules={{
                required: true,
                validate: { validateCryptoAmount }
              }}
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
                >
                  {fiat.symbol}
                </Button>
              }
              inputRightElement={<SendMaxButton onClick={handleSendMax} />}
              rules={{
                required: true,
                validate: { validateFiatAmount }
              }}
            />
          )}
        </FormControl>
      </ModalBody>
      <ModalFooter>
        <Stack flex={1}>
          <Button
            isFullWidth
            isDisabled={!isValid || loading}
            colorScheme={amountFieldError ? 'red' : 'blue'}
            size='lg'
            onClick={handleNextClick}
            isLoading={loading}
          >
            <Text translation={amountFieldError || 'common.next'} />
          </Button>
          <Button isFullWidth variant='ghost' size='lg' mr={3} onClick={() => send.close()}>
            <Text translation='common.cancel' />
          </Button>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
