import { Button, Stack } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import axios from 'axios'
import { Summary } from 'features/defi/components/Summary'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { WrappedIcon } from 'components/AssetIcon'
import { getAxelarAssetTransferSdk } from 'components/Bridge/axelarAssetTransferSdkSingleton'
import { getAxelarQuerySdk } from 'components/Bridge/axelarQuerySdkSingleton'
import {
  chainNameToEvmChain,
  chainNameToGasToken,
  getDenomFromBridgeAsset,
} from 'components/Bridge/utils'
import { Card } from 'components/Card/Card'
import type { SendInput } from 'components/Modals/Send/Form'
import { useFormSend } from 'components/Modals/Send/hooks/useFormSend/useFormSend'
import type { EstimateFeesInput } from 'components/Modals/Send/utils'
import { estimateFees } from 'components/Modals/Send/utils'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { selectSelectedCurrency } from 'state/slices/preferencesSlice/selectors'
import { selectFirstAccountIdByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { EditableAddress } from '../components/EditableAddress'
import type { BridgeState } from '../types'
import { BridgeRoutePaths } from '../types'
import { WithBackButton } from './WithBackButton'

const moduleLogger = logger.child({ namespace: ['Confirm'] })

export const Confirm: React.FC = () => {
  const history = useHistory()
  const [isLoadingRelayerFee, setIsLoadingRelayerFee] = useState(true)
  const [isExecutingTransaction, setIsExecutingTransaction] = useState(false)
  const selectedCurrency = useAppSelector(selectSelectedCurrency)
  const { handleSend } = useFormSend()
  const translate = useTranslate()

  const axelarAssetTransferSdk = getAxelarAssetTransferSdk()
  const axelarQuerySdk = getAxelarQuerySdk()

  const handleBack = () => {
    history.push(BridgeRoutePaths.Input)
  }

  const { control, setValue } = useFormContext<BridgeState>()

  const [
    bridgeAsset,
    cryptoAmountBaseUnit,
    fromChain,
    toChain,
    receiveAddress,
    relayerFeeUsdc,
    fiatAmount,
  ] = useWatch({
    control,
    name: [
      'asset',
      'cryptoAmountBaseUnit',
      'fromChain',
      'toChain',
      'receiveAddress',
      'relayerFeeUsdc',
      'fiatAmount',
    ],
  })

  const asset = useAppSelector(state => selectAssetById(state, bridgeAsset?.assetId ?? ''))
  const { price: bridgeTokenPrice } = useAppSelector(state =>
    selectMarketDataById(state, bridgeAsset?.assetId ?? ''),
  )
  const { assetReference } = fromAssetId(bridgeAsset?.assetId ?? '')
  const accountId = useAppSelector(state => selectFirstAccountIdByChainId(state, asset?.chainId))

  const sourceChainName = fromChain?.name ? chainNameToEvmChain(fromChain.name) : undefined
  const destinationChainName = toChain?.name ? chainNameToEvmChain(toChain.name) : undefined
  const sourceChainTokenSymbol = fromChain?.name ? chainNameToGasToken(fromChain.name) : undefined
  const assetDenom = getDenomFromBridgeAsset(bridgeAsset)

  useEffect(() => {
    ;(async () => {
      try {
        // We can't use axelarQuerySdk.getTransferFee() because of a CORS issue with the SDK
        const baseUrl = 'https://lcd-axelar.imperator.co/axelar/nexus/v1beta1/transfer_fee'
        const requestUrl = `${baseUrl}?source_chain=${sourceChainName}&destination_chain=${destinationChainName}&amount=${cryptoAmountBaseUnit}${assetDenom}`
        const {
          data: {
            fee: { amount },
          },
        } = await axios.get(requestUrl)
        setValue('relayerFeeUsdc', fromBaseUnit(amount, 6))

        setIsLoadingRelayerFee(false)
      } catch (e) {
        moduleLogger.error(e, 'GasFee error')
      }
    })()
  }, [
    assetDenom,
    axelarQuerySdk,
    cryptoAmountBaseUnit,
    destinationChainName,
    fromChain?.name,
    setValue,
    sourceChainName,
    sourceChainTokenSymbol,
    toChain?.name,
  ])

  const handleContinue = async () => {
    setIsExecutingTransaction(true)
    try {
      const assetDenom = getDenomFromBridgeAsset(bridgeAsset)

      const depositAddress = await axelarAssetTransferSdk.getDepositAddress(
        sourceChainName ?? '',
        destinationChainName ?? '',
        receiveAddress ?? '',
        assetDenom ?? '',
      )
      setValue('depositAddress', depositAddress)

      const estimateFeesArgs: EstimateFeesInput = {
        cryptoAmountBaseUnit,
        asset,
        address: depositAddress,
        sendMax: false,
        accountId: accountId ?? '',
        contractAddress: assetReference,
      }

      const estimatedFeesCryptoBaseUnit = await estimateFees(estimateFeesArgs)

      const handleSendArgs: SendInput = {
        cryptoAmountBaseUnit,
        asset,
        address: depositAddress,
        sendMax: false,
        accountId: accountId ?? '',
        amountFieldError: '',
        cryptoSymbol: bridgeAsset?.symbol ?? '',
        estimatedFeesCryptoBaseUnit,
        feeType: FeeDataKey.Average,
        fiatAmount: '',
        fiatSymbol: selectedCurrency,
        vanityAddress: '',
        input: depositAddress,
      }

      await handleSend(handleSendArgs)
      history.push(BridgeRoutePaths.Status)
    } catch (e) {
      moduleLogger.error(e, 'GasFee error')
      setIsExecutingTransaction(false)
    }
  }

  if (!bridgeAsset && !fromChain && !toChain) return null

  const isSendAmountGreaterThanFee = relayerFeeUsdc
    ? bnOrZero(fiatAmount).isGreaterThan(bnOrZero(relayerFeeUsdc))
    : true

  const transferFeeNativeToken = bnOrZero(relayerFeeUsdc)
    .dividedBy(bnOrZero(bridgeTokenPrice))
    .valueOf()
  const receiveAmount = bnOrZero(cryptoAmountBaseUnit)
    .minus(bnOrZero(transferFeeNativeToken))
    .decimalPlaces(4)
    .valueOf()

  return (
    <SlideTransition>
      <Card variant='unstyled'>
        <Card.Header px={0} pt={0}>
          <WithBackButton handleBack={handleBack}>
            <Card.Heading textAlign='center'>
              <Text translation='bridge.confirm' />
            </Card.Heading>
          </WithBackButton>
        </Card.Header>
        <Stack spacing={6}>
          <Summary>
            <Row variant='vert-gutter'>
              <Row.Label>
                <Text translation='common.send' />
              </Row.Label>
              <Row px={0} fontWeight='medium'>
                <Stack direction='row' alignItems='center'>
                  <WrappedIcon size='sm' src={bridgeAsset?.icon} wrapColor={fromChain?.color} />
                  <Stack spacing={0} alignItems='flex-start' justifyContent='center'>
                    <RawText>{fromChain?.symbol}</RawText>
                    <RawText fontSize='sm' color='gray.500'>
                      {fromChain?.name}
                    </RawText>
                  </Stack>
                </Stack>
                {fromChain?.symbol && (
                  <Row.Value color='red.400'>
                    <Amount.Crypto
                      prefix='-'
                      value={cryptoAmountBaseUnit ?? '0'}
                      symbol={fromChain?.symbol}
                    />
                  </Row.Value>
                )}
              </Row>
            </Row>
            <Row variant='vert-gutter'>
              <Row.Label>
                <Text translation='common.receive' />
              </Row.Label>
              <Row px={0} fontWeight='medium' alignItems='center'>
                <Stack direction='row' alignItems='center'>
                  <WrappedIcon size='sm' src={bridgeAsset?.icon} wrapColor={toChain?.color} />
                  <Stack spacing={0} alignItems='flex-start' justifyContent='center'>
                    <RawText>{toChain?.symbol}</RawText>
                    <RawText fontSize='sm' color='gray.500'>
                      {toChain?.name}
                    </RawText>
                  </Stack>
                </Stack>
                {isLoadingRelayerFee ? (
                  <Text translation='common.loadingText' />
                ) : (
                  <Row.Value color='green.200'>
                    {isSendAmountGreaterThanFee && (
                      <Amount.Crypto
                        prefix='+'
                        value={receiveAmount ?? '0'}
                        symbol={toChain?.symbol ?? ''}
                      />
                    )}
                  </Row.Value>
                )}
              </Row>
            </Row>
            <Stack spacing={0}>
              <Row variant='gutter'>
                <Row.Label>{translate('bridge.waitTimeLabel')}</Row.Label>
                <Row.Value>{translate('bridge.waitTimeValue')}</Row.Value>
              </Row>
              <Row variant='gutter'>
                <Row.Label>{translate('bridge.route')}</Row.Label>
                <Row.Value>Axelar</Row.Value>
              </Row>
              <Row variant='gutter' alignItems='center'>
                <Row.Label>{translate('bridge.receiveAddress')}</Row.Label>
                <Row.Value>
                  <EditableAddress />
                </Row.Value>
              </Row>
              <Row variant='gutter'>
                <Row.Label>
                  <Text translation='common.relayerGasFee' />
                </Row.Label>
                <Row.Value>
                  <Stack textAlign='right' spacing={0}>
                    {isLoadingRelayerFee ? (
                      <Text translation='common.loadingText' />
                    ) : (
                      <>
                        <Amount.Fiat fontWeight='bold' value={relayerFeeUsdc ?? '0'} />
                        <Amount.Crypto
                          color='gray.500'
                          value={transferFeeNativeToken ?? '0'}
                          symbol={bridgeAsset?.symbol ?? ''}
                        />
                      </>
                    )}
                  </Stack>
                </Row.Value>
              </Row>
            </Stack>
          </Summary>
          <Button
            size='lg'
            onClick={handleContinue}
            disabled={isLoadingRelayerFee || isExecutingTransaction || !isSendAmountGreaterThanFee}
            isLoading={isExecutingTransaction}
            colorScheme={isSendAmountGreaterThanFee ? 'blue' : 'red'}
          >
            <Text
              translation={
                isSendAmountGreaterThanFee ? 'bridge.startBridge' : 'bridge.feeExceedsSend'
              }
            />
          </Button>
        </Stack>
      </Card>
    </SlideTransition>
  )
}
