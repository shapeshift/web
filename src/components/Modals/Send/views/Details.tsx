import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  Input,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  Stack,
  Tooltip,
} from '@chakra-ui/react'
import type { AccountId } from '@keepkey/caip'
import { fromAssetId } from '@keepkey/caip'
import { CHAIN_NAMESPACE } from '@keepkey/caip/dist/constants'
import isNil from 'lodash/isNil'
import { useCallback, useMemo } from 'react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { AccountCard } from 'components/AccountCard'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { Amount } from 'components/Amount/Amount'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { TokenRow } from 'components/TokenRow/TokenRow'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'

import type { SendInput } from '../Form'
import { useSendDetails } from '../hooks/useSendDetails/useSendDetails'
import { SendFormFields, SendRoutes } from '../SendCommon'
import { SendMaxButton } from '../SendMaxButton/SendMaxButton'

const MAX_COSMOS_SDK_MEMO_LENGTH = 256

export const Details = () => {
  const { control, setValue } = useFormContext<SendInput>()
  const history = useHistory()
  const translate = useTranslate()

  const {
    accountId,
    amountFieldError,
    asset,
    cryptoAmount,
    cryptoSymbol,
    fiatAmount,
    fiatSymbol,
    memo,
  } = useWatch({
    control,
  }) as Partial<SendInput>

  const handleAccountChange = useCallback(
    (accountId: AccountId) => {
      setValue(SendFormFields.AccountId, accountId)
      setValue(SendFormFields.CryptoAmount, '')
      setValue(SendFormFields.FiatAmount, '')
    },
    [setValue],
  )

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

  const showMemoField = useMemo(
    () => Boolean(asset && fromAssetId(asset.assetId).chainNamespace === CHAIN_NAMESPACE.CosmosSdk),
    [asset],
  )
  const remainingMemoChars = useMemo(
    () => bnOrZero(MAX_COSMOS_SDK_MEMO_LENGTH - Number(memo?.length)),
    [memo],
  )
  const memoFieldError = remainingMemoChars.lt(0) && 'Characters Limit Exceeded'

  if (!(asset && !isNil(cryptoAmount) && cryptoSymbol && !isNil(fiatAmount) && fiatSymbol)) {
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
        <AccountDropdown
          assetId={asset.assetId}
          defaultAccountId={accountId}
          onChange={handleAccountChange}
          buttonProps={{ width: 'full', mb: 2, variant: 'solid' }}
        />
        <AccountCard
          asset={asset}
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
        {showMemoField && (
          <FormControl mt={6}>
            <Box display='flex' alignItems='center' justifyContent='space-between'>
              <FormLabel color='gray.500' display='flex' alignItems='center'>
                <Text
                  translation={['modals.send.sendForm.assetMemo', { assetSymbol: asset.symbol }]}
                />
                <Tooltip
                  placement='right'
                  label={translate('modals.send.sendForm.memoExplainer', {
                    assetSymbol: asset.symbol,
                  })}
                  fontSize='md'
                  pr={4}
                >
                  <Box ml='5px'>
                    <FaInfoCircle />
                  </Box>
                </Tooltip>
              </FormLabel>
              <FormHelperText
                mt={0}
                mr={3}
                mb={2}
                as='button'
                type='button'
                color={memoFieldError ? 'red.500' : 'gray.500'}
              >
                {translate('modals.send.sendForm.charactersRemaining', {
                  charactersRemaining: remainingMemoChars.toString(),
                })}
              </FormHelperText>
            </Box>
            <Controller
              name={SendFormFields.Memo}
              render={({ field: { onChange, value } }) => (
                <Input
                  size='lg'
                  onChange={({ target: { value } }) => onChange(value)}
                  value={value}
                  type='text'
                  variant='filled'
                  placeholder={translate('modals.send.sendForm.optionalAssetMemo', {
                    assetSymbol: asset.symbol,
                  })}
                />
              )}
            />
          </FormControl>
        )}
      </ModalBody>
      <ModalFooter>
        <Stack flex={1}>
          <Button
            width='full'
            isDisabled={
              !(cryptoAmount ?? fiatAmount) ||
              !!amountFieldError ||
              loading ||
              Boolean(memoFieldError)
            }
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
