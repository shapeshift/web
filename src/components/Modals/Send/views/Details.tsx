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
  usePrevious,
} from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE } from '@shapeshiftoss/caip/dist/constants'
import isNil from 'lodash/isNil'
import React, { useCallback, useEffect, useMemo } from 'react'
import type { ControllerRenderProps, FieldValues } from 'react-hook-form'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { AccountCard } from 'components/AccountCard'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { Amount } from 'components/Amount/Amount'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { TokenRow } from 'components/TokenRow/TokenRow'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { SendInput } from '../Form'
import { useSendDetails } from '../hooks/useSendDetails/useSendDetails'
import { SendFormFields, SendRoutes } from '../SendCommon'
import { SendMaxButton } from '../SendMaxButton/SendMaxButton'

type RenderController = ({
  field,
}: {
  field: ControllerRenderProps<FieldValues, SendFormFields.Memo>
}) => React.ReactElement

const MAX_COSMOS_SDK_MEMO_LENGTH = 256

const controllerRules = {
  required: true,
}
const arrowBackIcon = <ArrowBackIcon />
const accountDropdownButtonProps = { width: 'full', mb: 2, variant: 'solid' }
const formHelperTextHoverStyle = { color: 'gray.400', transition: '.2s color ease' }

export const Details = () => {
  const { control, setValue, trigger } = useFormContext<SendInput>()
  const history = useHistory()
  const translate = useTranslate()

  const { accountId, amountFieldError, assetId, cryptoAmount, fiatAmount, fiatSymbol, memo } =
    useWatch({
      control,
    }) as Partial<SendInput>

  const previousAccountId = usePrevious(accountId)

  const handleAccountChange = useCallback(
    (accountId: AccountId) => {
      setValue(SendFormFields.AccountId, accountId)
      if (!previousAccountId) return
      if (!cryptoAmount) setValue(SendFormFields.CryptoAmount, '')
      if (!fiatAmount) setValue(SendFormFields.FiatAmount, '')
    },
    [cryptoAmount, fiatAmount, previousAccountId, setValue],
  )

  const { close: handleClose } = useModal('send')
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

  useEffect(() => {
    // This component initially mounts without an accountId, because of how <AccountDropdown /> works
    // Also turns out we don't handle re-validation in case of changing AccountIds
    // This effect takes care of both the initial/account change cases
    if ((previousAccountId ?? '') !== accountId) {
      const inputAmount = fieldName === SendFormFields.CryptoAmount ? cryptoAmount : fiatAmount
      handleInputChange(inputAmount ?? '0')
      trigger(fieldName)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId])

  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  const showMemoField = useMemo(
    () => Boolean(assetId && fromAssetId(assetId).chainNamespace === CHAIN_NAMESPACE.CosmosSdk),
    [assetId],
  )
  const remainingMemoChars = useMemo(
    () => bnOrZero(MAX_COSMOS_SDK_MEMO_LENGTH - Number(memo?.length)),
    [memo],
  )
  const memoFieldError = remainingMemoChars.lt(0) && 'Characters Limit Exceeded'

  const cryptoTokenRowInputLeftElement = useMemo(
    () => (
      <Button
        ml={1}
        size='sm'
        variant='ghost'
        textTransform='uppercase'
        onClick={toggleCurrency}
        width='full'
      >
        {asset?.symbol}
      </Button>
    ),
    [asset?.symbol, toggleCurrency],
  )

  const fiatTokenRowInputLeftElement = useMemo(
    () => (
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
    ),
    [fiatSymbol, toggleCurrency],
  )

  const tokenRowInputRightElement = useMemo(
    () =>
      wallet?.getVendor() === 'WalletConnect' ? null : <SendMaxButton onClick={handleSendMax} />,
    [wallet, handleSendMax],
  )

  const assetMemoTranslation: TextPropTypes['translation'] = useMemo(
    () => ['modals.send.sendForm.assetMemo', { assetSymbol: asset?.symbol ?? '' }],
    [asset?.symbol],
  )

  const handleArrowBackClick = useCallback(() => history.push(SendRoutes.Address), [history])
  const handleAccountCardClick = useCallback(() => history.push('/send/select'), [history])

  const renderController: RenderController = useCallback(
    ({ field: { onChange, value } }) => (
      <Input
        size='lg'
        // this is already within a useCallback
        // eslint-disable-next-line react-memo/require-usememo
        onChange={({ target: { value } }) => onChange(value)}
        value={value}
        type='text'
        variant='filled'
        placeholder={translate('modals.send.sendForm.optionalAssetMemo', {
          assetSymbol: asset?.symbol ?? '',
        })}
      />
    ),
    [asset?.symbol, translate],
  )

  if (!(asset && !isNil(cryptoAmount) && !isNil(fiatAmount) && fiatSymbol)) {
    return null
  }

  return (
    <SlideTransition loading={balancesLoading}>
      <IconButton
        variant='ghost'
        icon={arrowBackIcon}
        aria-label='Back'
        position='absolute'
        top={2}
        left={3}
        fontSize='xl'
        size='sm'
        isRound
        onClick={handleArrowBackClick}
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
          buttonProps={accountDropdownButtonProps}
        />
        <AccountCard
          asset={asset}
          isLoaded={!balancesLoading}
          cryptoAmountAvailable={cryptoHumanBalance.toString()}
          fiatAmountAvailable={fiatBalance.toString()}
          showCrypto={fieldName === SendFormFields.CryptoAmount}
          onClick={handleAccountCardClick}
          mb={2}
        />
        <FormControl mt={6}>
          <Box display='flex' alignItems='center' justifyContent='space-between'>
            <FormLabel color='text.subtle'>
              {translate('modals.send.sendForm.sendAmount')}
            </FormLabel>
            <FormHelperText
              mt={0}
              mr={3}
              mb={2}
              as='button'
              type='button'
              color='text.subtle'
              onClick={toggleCurrency}
              textTransform='uppercase'
              _hover={formHelperTextHoverStyle}
            >
              {fieldName === SendFormFields.FiatAmount ? (
                <Amount.Crypto value={cryptoAmount} symbol={asset.symbol} prefix='≈' />
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
              inputLeftElement={cryptoTokenRowInputLeftElement}
              inputRightElement={tokenRowInputRightElement}
              rules={controllerRules}
              data-test='send-modal-crypto-input'
            />
          )}
          {fieldName === SendFormFields.FiatAmount && (
            <TokenRow
              control={control}
              fieldName={SendFormFields.FiatAmount}
              onInputChange={handleInputChange}
              inputLeftElement={fiatTokenRowInputLeftElement}
              inputRightElement={tokenRowInputRightElement}
              rules={controllerRules}
              data-test='send-modal-fiat-input'
            />
          )}
        </FormControl>
        {showMemoField && (
          <FormControl mt={6}>
            <Box display='flex' alignItems='center' justifyContent='space-between'>
              <FormLabel color='text.subtle' display='flex' alignItems='center'>
                <Text translation={assetMemoTranslation} />
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
                color={memoFieldError ? 'red.500' : 'text.subtle'}
              >
                {translate('modals.send.sendForm.charactersRemaining', {
                  charactersRemaining: remainingMemoChars.toString(),
                })}
              </FormHelperText>
            </Box>
            <Controller name={SendFormFields.Memo} render={renderController} />
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
          <Button width='full' variant='ghost' size='lg' mr={3} onClick={handleClose}>
            <Text translation='common.cancel' />
          </Button>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
