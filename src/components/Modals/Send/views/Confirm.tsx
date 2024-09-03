import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Stack,
  useColorModeValue,
} from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip/dist/assetId/assetId'
import { CHAIN_NAMESPACE } from '@shapeshiftoss/caip/dist/constants'
import type { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { getConfig } from 'config'
import type { ChangeEvent } from 'react'
import { useCallback, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { Amount } from 'components/Amount/Amount'
import { InlineCopyButton } from 'components/InlineCopyButton'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { DialogBackButton } from 'components/Modal/components/DialogBackButton'
import { DialogBody } from 'components/Modal/components/DialogBody'
import { DialogFooter } from 'components/Modal/components/DialogFooter'
import { DialogHeader } from 'components/Modal/components/DialogHeader'
import { DialogTitle } from 'components/Modal/components/DialogTitle'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { isNonEmptyString } from 'lib/utils'
import { isUtxoAccountId } from 'lib/utils/utxo'
import { selectAssetById, selectFeeAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { SendInput } from '../Form'
import { useSendFees } from '../hooks/useSendFees/useSendFees'
import { SendFormFields, SendRoutes } from '../SendCommon'
import { TxFeeRadioGroup } from '../TxFeeRadioGroup'

export type FeePrice = {
  [key in FeeDataKey]: {
    fiatFee: string
    txFee: string
    gasPriceGwei?: string
  }
}

const accountDropdownButtonProps = { variant: 'ghost', height: 'auto', p: 0, size: 'md' }

export const Confirm = () => {
  const {
    control,
    formState: { isSubmitting },
    setValue,
  } = useFormContext<SendInput>()
  const history = useHistory()
  const translate = useTranslate()
  const {
    accountId,
    to,
    assetId,
    amountCryptoPrecision,
    feeType,
    fiatAmount,
    memo,
    vanityAddress,
  } = useWatch({
    control,
  }) as Partial<SendInput>
  const { fees } = useSendFees()
  const allowCustomSendNonce = getConfig().REACT_APP_EXPERIMENTAL_CUSTOM_SEND_NONCE

  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId ?? ''))
  const showMemoRow = useMemo(
    () => Boolean(assetId && fromAssetId(assetId).chainNamespace === CHAIN_NAMESPACE.CosmosSdk),
    [assetId],
  )

  const amountWithFees = useMemo(() => {
    const { fiatFee } = fees ? fees[feeType as FeeDataKey] : { fiatFee: 0 }
    return bnOrZero(fiatAmount).plus(fiatFee).toString()
  }, [fiatAmount, fees, feeType])

  const cryptoAmountFee = useMemo(() => {
    const { txFee } = fees ? fees[feeType as FeeDataKey] : { txFee: 0 }
    return txFee.toString()
  }, [fees, feeType])

  const borderColor = useColorModeValue('gray.100', 'gray.750')

  const handleNonceChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setValue(SendFormFields.CustomNonce, value)
    },
    [setValue],
  )

  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  const handleClick = useCallback(() => history.push(SendRoutes.Details), [history])

  // We don't want this firing -- but need it for typing
  const handleAccountChange = useCallback(() => {}, [])

  const sendAssetTranslation: TextPropTypes['translation'] = useMemo(
    () => ['modals.send.confirm.sendAsset', { asset: asset?.name ?? '' }],
    [asset],
  )

  const assetMemoTranslation: TextPropTypes['translation'] = useMemo(
    () => ['modals.send.sendForm.assetMemo', { assetSymbol: asset?.symbol ?? '' }],
    [asset],
  )

  if (!(to && asset?.name && amountCryptoPrecision && fiatAmount && feeType)) return null

  return (
    <SlideTransition className='flex flex-col h-full'>
      <DialogHeader>
        <DialogBackButton onClick={handleClick} />
        <DialogTitle textAlign='center'>
          <Text translation={sendAssetTranslation} />
        </DialogTitle>
      </DialogHeader>
      <DialogBody>
        <Flex flexDirection='column' alignItems='center' mb={8}>
          <Amount.Crypto
            fontSize='4xl'
            fontWeight='bold'
            lineHeight='shorter'
            textTransform='uppercase'
            symbol={asset.symbol}
            value={amountCryptoPrecision}
          />
          <Amount.Fiat color='text.subtle' fontSize='xl' lineHeight='short' value={fiatAmount} />
        </Flex>
        <Stack spacing={4} mb={4}>
          <Row alignItems='center'>
            <Row.Label>
              <Text translation='modals.send.confirm.sendFrom' />
            </Row.Label>
            <Row.Value display='flex' alignItems='center'>
              <InlineCopyButton
                isDisabled={!accountId || isUtxoAccountId(accountId)}
                value={fromAccountId(accountId ?? '').account}
              >
                <AccountDropdown
                  onChange={handleAccountChange}
                  assetId={asset.assetId}
                  defaultAccountId={accountId}
                  buttonProps={accountDropdownButtonProps}
                  disabled
                />
              </InlineCopyButton>
            </Row.Value>
          </Row>
          <Row>
            <Row.Label>
              <Text translation={'modals.send.confirm.sendTo'} />
            </Row.Label>
            <Row.Value>
              <InlineCopyButton value={isNonEmptyString(vanityAddress) ? vanityAddress : to}>
                {vanityAddress ? vanityAddress : <MiddleEllipsis value={to} />}
              </InlineCopyButton>
            </Row.Value>
          </Row>
          {allowCustomSendNonce && (
            <Row>
              <Row.Label>
                <Text translation={'modals.send.confirm.customNonce'} />
              </Row.Label>
              <Row.Value>
                <Input
                  onChange={handleNonceChange}
                  type='text'
                  placeholder={''}
                  pl={10}
                  variant='filled'
                />
              </Row.Value>
            </Row>
          )}
          {showMemoRow && (
            <Row>
              <Row.Label>
                <Text translation={assetMemoTranslation} />
              </Row.Label>
              <Row.Value>
                <RawText>{memo}</RawText>
              </Row.Value>
            </Row>
          )}
          <FormControl mt={4}>
            <Row variant='vertical'>
              <Row.Label>
                <FormLabel color='text.subtle' htmlFor='tx-fee'>
                  {translate('modals.send.sendForm.transactionFee')}
                </FormLabel>
              </Row.Label>
              <TxFeeRadioGroup fees={fees} />
            </Row>
          </FormControl>
        </Stack>
      </DialogBody>
      <DialogFooter flexDirection='column' borderTopWidth={1} borderColor={borderColor}>
        <Row gap={2}>
          <Box flex={1}>
            <Row.Label color='inherit' fontWeight='bold'>
              <Text translation='modals.send.confirm.total' />
            </Row.Label>
            <Row.Label
              flexDirection='row'
              display='flex'
              flexWrap='wrap'
              justifyContent='flex-start'
            >
              <Text translation='modals.send.confirm.amount' />
              <RawText mx={1}>+</RawText>
              <Text translation='modals.send.confirm.transactionFee' />
            </Row.Label>
          </Box>
          <Box textAlign='right' flex={1}>
            <Row.Value flex={1}>
              <Amount.Fiat value={amountWithFees} fontWeight='bold' />
            </Row.Value>
            <Row.Label display='flex' gap={1} flexWrap='wrap' justifyContent='flex-end'>
              <Amount.Crypto
                textTransform='uppercase'
                maximumFractionDigits={6}
                symbol={asset.symbol}
                value={amountCryptoPrecision}
              />
              <Amount.Crypto prefix='+' value={cryptoAmountFee} symbol={feeAsset?.symbol ?? ''} />
            </Row.Label>
          </Box>
        </Row>
        <Button
          colorScheme='blue'
          disabled={!fees || isSubmitting}
          isLoading={isSubmitting}
          loadingText={translate('modals.send.broadcastingTransaction')}
          size='lg'
          mt={6}
          type='submit'
          width='full'
        >
          <Text translation='common.confirm' />
        </Button>
      </DialogFooter>
    </SlideTransition>
  )
}
