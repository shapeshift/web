// import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  Stack
} from '@chakra-ui/react'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { getAssetData } from '@shapeshiftoss/market-service'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { TokenRow } from 'components/TokenRow/TokenRow'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useBalances } from 'hooks/useBalances/useBalances'
import { bnOrZero } from 'lib/bignumber'
import debounce from 'lodash/debounce'
import get from 'lodash/get'
import { useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'

import { SendRoutes } from '../Send'

const flattenTokenBalances = (balances: any) =>
  Object.keys(balances).reduce((acc: any, key) => {
    const value = balances[key]
    acc[key] = value
    if (value.tokens) {
      value.tokens.forEach((token: any) => {
        acc[token.contract.toLowerCase()] = token
      })
    }
    return acc
  }, {})

enum AmountFieldName {
  Fiat = 'fiat.amount',
  Crypto = 'crypto.amount'
}

export const Details = () => {
  const [fieldName, setFieldName] = useState<AmountFieldName>(AmountFieldName.Fiat)
  const translate = useTranslate()
  const history = useHistory()
  const {
    control,
    getValues,
    setValue,
    formState: { isValid, errors }
  } = useFormContext()
  const [asset, address, crypto, fiat] = useWatch({ name: ['asset', 'address', 'crypto', 'fiat'] })

  const { balances } = useBalances()
  const {
    state: { wallet }
  } = useWallet()
  const chainAdapter = useChainAdapters()
  const modal = useModal()

  const toggleCurrency = () => {
    setFieldName(fieldName === AmountFieldName.Fiat ? AmountFieldName.Crypto : AmountFieldName.Fiat)
  }

  /** When selecting new assets the network (CHAIN) is not returned from the market service. This will break */
  const adapter = chainAdapter.byChain(asset.network)

  const flattenedBalances = flattenTokenBalances(balances)
  const assetBalance = flattenedBalances[asset?.contractAddress]

  const accountBalances = useMemo(() => {
    const crypto = bnOrZero(assetBalance?.balance).div(`1e${assetBalance?.decimals}`)
    const fiat = crypto.times(asset.price)
    return {
      crypto,
      fiat
    }
  }, [assetBalance, asset])

  const fiatField = fieldName === 'fiat.amount'

  const buildTransaction = async () => {
    const values = getValues()
    if (wallet) {
      const path = "m/44'/60'/0'/0/0" // TODO get from asset service
      const value = bnOrZero(values.crypto.amount)
        .times(bnOrZero(10).exponentiatedBy(values.asset.decimals))
        .toString()
      const data = await adapter.buildSendTransaction({
        to: values.address,
        value,
        erc20ContractAddress: values.asset.contractAddress,
        wallet,
        path
      })
      return data
    }
  }

  const onNext = async () => {
    const tx = await buildTransaction()
    setValue('transaction', tx)
    history.push(SendRoutes.Confirm)
  }

  const handleSendMax = async () => {
    if (wallet) {
      const path = "m/44'/60'/0'/0/0"
      const fromAddress = await adapter.getAddress({ wallet, path })
      const adapterFees = await adapter.getFeeData({
        to: address,
        from: fromAddress,
        value: '0',
        contractAddress: asset?.contractAddress
      })
      const averageFee = adapterFees[FeeDataKey.Average]
      const chainAsset = await getAssetData(asset.network)
      // TODO replace precision with data from asset service
      const networkFee = bnOrZero(averageFee.networkFee)
        .div(`1e${18}`)
        .times(chainAsset?.price || 0)

      // TODO (technojak): change to tokenId when integrated with asset-service
      if (asset.contractAddress) {
        setValue('crypto.amount', accountBalances.crypto.toPrecision())
        setValue('fiat.amount', accountBalances.fiat.toPrecision())
      } else {
        const maxCrypto = accountBalances.crypto.minus(networkFee)
        const maxFiat = maxCrypto.times(chainAsset?.price || 0)
        setValue('crypto.amount', maxCrypto.toPrecision())
        setValue('fiat.amount', maxFiat.toPrecision())
      }
    }
  }

  const handleInputChange = debounce((inputValue: string) => {
    const key = !fiatField ? AmountFieldName.Fiat : AmountFieldName.Crypto
    const assetPrice = asset.price
    const amount = fiatField
      ? bnOrZero(inputValue).div(assetPrice).toString()
      : bnOrZero(inputValue).times(assetPrice).toString()
    setValue(key, amount)
  }, 300)

  const validateCryptoAmount = (value: string) => {
    const hasValidBalance = accountBalances.crypto.gte(value)
    return hasValidBalance || 'common.insufficientFunds'
  }

  const validateFiatAmount = (value: string) => {
    const hasValidBalance = accountBalances.fiat.gte(value)
    return hasValidBalance || 'common.insufficientFunds'
  }

  const cryptoError = get(errors, 'crypto.amount.message', null)
  const fiatError = get(errors, 'fiat.amount.message', null)
  const balanceError = cryptoError || fiatError

  const renderSendMax = () => (
    <Button
      colorScheme='blue'
      h='1.75rem'
      onClick={handleSendMax}
      size='sm'
      type='button'
      variant='ghost'
    >
      <Text translation='modals.send.sendForm.max' />
    </Button>
  )

  return (
    <SlideTransition>
      {/** @todo Wire up asset select  */}
      {/* <IconButton
        variant='ghost'
        icon={<ArrowBackIcon />}
        aria-label='Back'
        position='absolute'
        top={2}
        left={3}
        fontSize='xl'
        size='sm'
        isRound
        onClick={() => history.push(SendRoutes.Select)}
      /> */}
      <ModalHeader textAlign='center'>
        {translate('modals.send.sendForm.sendAsset', { asset: asset.name })}
      </ModalHeader>
      <ModalCloseButton borderRadius='full' />
      <ModalBody>
        <FormControl mt={4}>
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
              _hover={{ color: 'white' }}
            >
              ≈{' '}
              {fiatField
                ? `${crypto.amount ?? 0} ${crypto.symbol}`
                : `${fiat.amount ?? 0} ${fiat.symbol}`}
            </FormHelperText>
          </Box>
          {fieldName === AmountFieldName.Crypto && (
            <TokenRow
              control={control}
              fieldName={AmountFieldName.Crypto}
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
              inputRightElement={renderSendMax()}
              rules={{
                required: true,
                validate: { validateCryptoAmount }
              }}
            />
          )}
          {fieldName === AmountFieldName.Fiat && (
            <TokenRow
              control={control}
              fieldName={AmountFieldName.Fiat}
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
              inputRightElement={renderSendMax()}
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
            isDisabled={!isValid}
            colorScheme={balanceError ? 'red' : 'blue'}
            size='lg'
            onClick={onNext}
          >
            <Text translation={balanceError || 'common.next'} />
          </Button>
          <Button isFullWidth variant='ghost' size='lg' mr={3} onClick={() => modal.close('send')}>
            <Text translation='common.cancel' />
          </Button>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
