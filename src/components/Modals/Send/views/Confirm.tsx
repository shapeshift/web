import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  IconButton,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  useColorModeValue,
} from '@chakra-ui/react'
import { fromAssetId } from '@keepkey/caip/dist/assetId/assetId'
import { CHAIN_NAMESPACE } from '@keepkey/caip/dist/constants'
import type { FeeDataKey } from '@keepkey/chain-adapters'
import { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { bnOrZero } from 'lib/bignumber/bignumber'

import type { SendInput } from '../Form'
import { useSendFees } from '../hooks/useSendFees/useSendFees'
import { SendRoutes } from '../SendCommon'
import { TxFeeRadioGroup } from '../TxFeeRadioGroup'

export type FeePrice = {
  [key in FeeDataKey]: {
    fiatFee: string
    txFee: string
  }
}

export const Confirm = () => {
  const {
    control,
    formState: { isSubmitting },
  } = useFormContext<SendInput>()
  const history = useHistory()
  const translate = useTranslate()
  const {
    accountId,
    address,
    asset,
    cryptoAmount,
    cryptoSymbol,
    feeType,
    fiatAmount,
    memo,
    vanityAddress,
  } = useWatch({
    control,
  }) as Partial<SendInput>
  const { fees } = useSendFees()
  const isMultiAccountsEnabled = useFeatureFlag('MultiAccounts')

  const showMemoRow = useMemo(
    () => Boolean(asset && fromAssetId(asset.assetId).chainNamespace === CHAIN_NAMESPACE.CosmosSdk),
    [asset],
  )

  const amountWithFees = useMemo(() => {
    const { fiatFee } = fees ? fees[feeType as FeeDataKey] : { fiatFee: 0 }
    return bnOrZero(fiatAmount).plus(fiatFee).toString()
  }, [fiatAmount, fees, feeType])

  const borderColor = useColorModeValue('gray.100', 'gray.750')

  // We don't want this firing -- but need it for typing
  const handleAccountChange = () => {}

  if (!(address && asset?.name && cryptoSymbol && cryptoAmount && fiatAmount && feeType))
    return null

  return (
    <SlideTransition>
      <IconButton
        variant='ghost'
        icon={<ArrowBackIcon />}
        aria-label={translate('common.back')}
        position='absolute'
        top={2}
        left={3}
        fontSize='xl'
        size='sm'
        isRound
        onClick={() => history.push(SendRoutes.Details)}
      />
      <ModalHeader textAlign='center'>
        <Text translation={['modals.send.confirm.sendAsset', { asset: asset.name }]} />
      </ModalHeader>
      <ModalBody>
        <Flex flexDirection='column' alignItems='center' mb={8}>
          <Amount.Crypto
            fontSize='4xl'
            fontWeight='bold'
            lineHeight='shorter'
            textTransform='uppercase'
            symbol={cryptoSymbol}
            value={cryptoAmount}
          />
          <Amount.Fiat color='gray.500' fontSize='xl' lineHeight='short' value={fiatAmount} />
        </Flex>
        <Stack spacing={4} mb={4}>
          {isMultiAccountsEnabled && (
            <Row alignItems='center'>
              <Row.Label>
                <Text translation='modals.send.confirm.sendFrom' />
              </Row.Label>
              <Row.Value display='flex' alignItems='center'>
                <AccountDropdown
                  onChange={handleAccountChange}
                  assetId={asset.assetId}
                  defaultAccountId={accountId}
                  buttonProps={{ variant: 'ghost', height: 'auto', p: 0, size: 'md' }}
                  disabled
                />
              </Row.Value>
            </Row>
          )}
          <Row>
            <Row.Label>
              <Text translation={'modals.send.confirm.sendTo'} />
            </Row.Label>
            <Row.Value>
              {vanityAddress ? vanityAddress : <MiddleEllipsis value={address} />}
            </Row.Value>
          </Row>
          {showMemoRow && (
            <Row>
              <Row.Label>
                <Text
                  translation={['modals.send.sendForm.assetMemo', { assetSymbol: asset.symbol }]}
                />
              </Row.Label>
              <Row.Value>
                <RawText>{memo}</RawText>
              </Row.Value>
            </Row>
          )}
          <FormControl mt={4}>
            <Row variant='vertical'>
              <Row.Label>
                <FormLabel color='gray.500' htmlFor='tx-fee'>
                  {translate('modals.send.sendForm.transactionFee')}
                </FormLabel>
              </Row.Label>
              <TxFeeRadioGroup fees={fees} />
            </Row>
          </FormControl>
        </Stack>
      </ModalBody>
      <ModalFooter flexDirection='column' borderTopWidth={1} borderColor={borderColor}>
        <Row>
          <Box>
            <Row.Label color='inherit' fontWeight='bold'>
              <Text translation='modals.send.confirm.total' />
            </Row.Label>
            <Row.Label flexDirection='row' display='flex'>
              <Text translation='modals.send.confirm.amount' />
              <RawText mx={1}>+</RawText>
              <Text translation='modals.send.confirm.transactionFee' />
            </Row.Label>
          </Box>
          <Box textAlign='right'>
            <Row.Value>
              <Amount.Crypto
                textTransform='uppercase'
                maximumFractionDigits={6}
                symbol={cryptoSymbol}
                value={cryptoAmount}
              />
            </Row.Value>
            <Row.Label>
              <Amount.Fiat value={amountWithFees} />
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
      </ModalFooter>
    </SlideTransition>
  )
}
