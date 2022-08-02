import { GasToken } from '@axelar-network/axelarjs-sdk'
import { Button, Stack } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import { Summary } from 'features/defi/components/Summary'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { RouteComponentProps } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { WrappedIcon } from 'components/AssetIcon'
import { getAxelarAssetTransferSdk } from 'components/Bridge/axelarAssetTransferSdkSingleton'
import { getAxelarQuerySdk } from 'components/Bridge/axelarQuerySdkSingleton'
import {
  chainIdToChainName,
  chainNameToAxelarEvmChain,
  chainNameToAxelarGasToken,
} from 'components/Bridge/utils'
import { Card } from 'components/Card/Card'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

import { EditableAddress } from '../components/EditableAddress'
import { BridgeAsset, BridgeRoutePaths, BridgeState } from '../types'
import { WithBackButton } from './WithBackButton'

type SelectAssetProps = {
  onClick: (asset: BridgeAsset) => void
} & RouteComponentProps

export const Confirm: React.FC<SelectAssetProps> = ({ history }) => {
  const [gasFeeUsdc, setGasFeeUsdc] = useState<string>()
  const [gasFeeCrypto, setGasFeeCrypto] = useState<string>()
  const [isLoadingFeeEstimates, setIsLoadingFeeEstimates] = useState(true)

  const axelarAssetTransferSdk = getAxelarAssetTransferSdk()
  const axelarQuerySdk = getAxelarQuerySdk()

  const handleBack = () => {
    history.push(BridgeRoutePaths.Input)
  }

  const { control } = useFormContext<BridgeState>()

  const [asset, cryptoAmount, fromChain, toChain, address] = useWatch({
    control,
    name: ['asset', 'cryptoAmount', 'fromChain', 'toChain', 'address'],
  })

  const sourceChainName = chainNameToAxelarEvmChain(fromChain?.name ?? '')
  const destinationChainName = chainNameToAxelarEvmChain(toChain?.name ?? '')
  const sourceChainTokenSymbol = chainNameToAxelarGasToken(fromChain?.name ?? '')

  // Get total fee estimate, including gas and Axelar fees
  useEffect(() => {
    ;(async () => {
      try {
        const estimateGasUsed = 400000

        const gasFeeCrypto = await axelarQuerySdk.estimateGasFee(
          sourceChainName,
          destinationChainName,
          sourceChainTokenSymbol,
          estimateGasUsed,
        )

        const gasFeeUsdc = await axelarQuerySdk.estimateGasFee(
          sourceChainName,
          destinationChainName,
          GasToken.USDC,
          estimateGasUsed,
        )
        setGasFeeUsdc(bnOrZero(gasFeeUsdc).dividedBy(bn(10).exponentiatedBy(16)).toFixed(2))
        setGasFeeCrypto(bnOrZero(gasFeeCrypto).dividedBy(bn(10).exponentiatedBy(16)).toFixed(10))
        setIsLoadingFeeEstimates(false)
      } catch (e) {
        console.error('GasFee error', e)
      }
    })()
  }, [
    axelarQuerySdk,
    destinationChainName,
    fromChain?.name,
    sourceChainName,
    sourceChainTokenSymbol,
    toChain?.name,
  ])

  const handleContinue = async () => {
    try {
      const chainId = fromAssetId(asset?.assetId ?? '').chainId
      const chainName = chainIdToChainName(chainId).toLowerCase() // the sdk uses lower case names for some reason
      const symbol = asset?.symbol ?? ''
      const assetDenom = await axelarQuerySdk.getDenomFromSymbol(symbol, chainName)

      const depositAddress = await axelarAssetTransferSdk.getDepositAddress(
        sourceChainName,
        destinationChainName,
        address ?? '',
        assetDenom ?? '',
      )
      console.log('depositAddress', depositAddress)

      // todo: handleSend
    } catch (e) {
      console.error('GasFee error', e)
    }
    history.push(BridgeRoutePaths.Status)
  }

  if (!asset && !fromChain && !toChain) return null

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
                  <WrappedIcon size='sm' src={asset?.icon} wrapColor={fromChain?.color} />
                  <Stack spacing={0} alignItems='flex-start' justifyContent='center'>
                    <RawText>{asset?.symbol}</RawText>
                    <RawText fontSize='sm' color='gray.500'>
                      {fromChain?.name}
                    </RawText>
                  </Stack>
                </Stack>
                {asset?.symbol && (
                  <Row.Value color='red.400'>
                    <Amount.Crypto prefix='-' value={cryptoAmount ?? '0'} symbol={asset.symbol} />
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
                  <WrappedIcon size='sm' src={asset?.icon} wrapColor={toChain?.color} />
                  <Stack spacing={0} alignItems='flex-start' justifyContent='center'>
                    <RawText>{asset?.symbol}</RawText>
                    <RawText fontSize='sm' color='gray.500'>
                      {toChain?.name}
                    </RawText>
                  </Stack>
                </Stack>
                {asset?.symbol && (
                  <Row.Value color='green.200'>
                    <Amount.Crypto prefix='+' value={cryptoAmount ?? '0'} symbol={asset.symbol} />
                  </Row.Value>
                )}
              </Row>
            </Row>
            <Stack spacing={0}>
              <Row variant='gutter'>
                <Row.Label>Approx. Wait Time</Row.Label>
                <Row.Value>~5-10 minutes</Row.Value>
              </Row>
              <Row variant='gutter'>
                <Row.Label>Route</Row.Label>
                <Row.Value>Axelar</Row.Value>
              </Row>
              <Row variant='gutter' alignItems='center'>
                <Row.Label>Receive Address</Row.Label>
                <Row.Value>
                  <EditableAddress />
                </Row.Value>
              </Row>
              <Row variant='gutter'>
                <Row.Label>
                  <Text translation='modals.confirm.estimatedGas' />
                </Row.Label>
                <Row.Value>
                  <Stack textAlign='right' spacing={0}>
                    {isLoadingFeeEstimates ? (
                      <p>Loading...</p>
                    ) : (
                      <>
                        <Amount.Fiat fontWeight='bold' value={gasFeeUsdc ?? 0} />
                        <Amount.Crypto
                          color='gray.500'
                          value={gasFeeCrypto ?? '0'}
                          symbol={sourceChainTokenSymbol ?? ''}
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
            colorScheme='blue'
            onClick={handleContinue}
            disabled={isLoadingFeeEstimates}
          >
            Start Bridge
          </Button>
        </Stack>
      </Card>
    </SlideTransition>
  )
}
