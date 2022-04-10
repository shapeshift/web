import { ArrowForwardIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons'
import { Box, Link, Stack, Tag, useColorModeValue } from '@chakra-ui/react'
import { AssetNamespace, AssetReference, caip19 } from '@shapeshiftoss/caip'
import { FoxyApi } from '@shapeshiftoss/investor-foxy'
import { NetworkTypes } from '@shapeshiftoss/types'
import { TxStatus } from 'features/defi/components/TxStatus/TxStatus'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useContext } from 'react'
import { useHistory } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { StatusTextEnum } from 'components/RouteSteps/RouteSteps'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectAssetByCAIP19, selectMarketDataById } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { DepositContext } from '../DepositContext'

export type FoxyStatusProps = {
  api: FoxyApi
  apy: string
}

export const Status = ({ api, apy }: FoxyStatusProps) => {
  const { state } = useContext(DepositContext)
  const history = useHistory()
  const appDispatch = useAppDispatch()
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chain, tokenId, rewardId } = query
  const network = NetworkTypes.MAINNET
  const assetNamespace = AssetNamespace.ERC20
  const defaultStatusBg = useColorModeValue('white', 'gray.700')
  const assetId = caip19.toCAIP19({ chain, network, assetNamespace, assetReference: tokenId })
  const feeAssetId = caip19.toCAIP19({
    chain,
    network,
    assetNamespace: AssetNamespace.Slip44,
    assetReference: AssetReference.Ethereum,
  })

  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  if (!marketData) appDispatch(marketApi.endpoints.findByCaip19.initiate(assetId))
  const feeAsset = useAppSelector(state => selectAssetByCAIP19(state, feeAssetId))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))
  const contractAssetId = caip19.toCAIP19({
    chain,
    network,
    assetNamespace,
    assetReference: rewardId,
  })
  const contractAsset = useAppSelector(state => selectAssetByCAIP19(state, contractAssetId))

  const handleViewPosition = () => {
    browserHistory.push('/defi')
  }

  const handleCancel = history.goBack

  if (!state) return null

  const { statusIcon, statusText, statusBg } = (() => {
    let statusIcon: React.ReactElement = <ArrowForwardIcon />
    let statusText = StatusTextEnum.pending
    let statusBg = defaultStatusBg
    if (state.deposit.txStatus === 'success') {
      statusText = StatusTextEnum.success
      statusIcon = <CheckIcon color='white' />
      statusBg = 'green.500'
    }
    if (state.deposit.txStatus === 'failed') {
      statusText = StatusTextEnum.failed
      statusIcon = <CloseIcon color='white' />
      statusBg = 'red.500'
    }
    return { statusIcon, statusText, statusBg }
  })()

  const annualYieldCrypto = bnOrZero(state.deposit?.cryptoAmount).times(bnOrZero(apy))
  const annualYieldFiat = annualYieldCrypto.times(marketData.price)

  return (
    <TxStatus
      onClose={handleCancel}
      onContinue={state.deposit.txStatus === 'success' ? handleViewPosition : undefined}
      loading={state.loading}
      statusText={statusText}
      statusIcon={statusIcon}
      bg={statusBg}
      continueText='modals.status.position'
      closeText='modals.status.close'
      assets={[
        {
          ...asset,
          cryptoAmount: state.deposit.cryptoAmount,
          fiatAmount: state.deposit.fiatAmount,
        },
        {
          ...contractAsset,
          cryptoAmount: bnOrZero(state.deposit.cryptoAmount).div(bnOrZero(1).div(1)).toString(),
          fiatAmount: state.deposit.fiatAmount,
        },
      ]}
    >
      <Stack spacing={4}>
        <Row>
          <Row.Label>
            <Text translation='modals.status.transactionId' />
          </Row.Label>
          <Row.Value>
            <Link
              href={`${asset.explorerTxLink}/${state.txid}`}
              isExternal
              color='blue.500'
              fontWeight='bold'
            >
              <MiddleEllipsis address={state.txid || ''} />
            </Link>
          </Row.Value>
        </Row>
        <Row>
          <Row.Label>
            <Text translation='modals.confirm.depositTo' />
          </Row.Label>
          <Row.Value fontWeight='bold'>Foxy</Row.Value>
        </Row>
        <Row>
          <Row.Label>
            <Text
              translation={
                state.deposit.txStatus === 'pending'
                  ? 'modals.status.estimatedGas'
                  : 'modals.status.gasUsed'
              }
            />
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(
                  state.deposit.txStatus === 'pending'
                    ? state.deposit.estimatedGasCrypto
                    : state.deposit.usedGasFee,
                )
                  .div(`1e+${feeAsset.precision}`)
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='gray.500'
                value={bnOrZero(
                  state.deposit.txStatus === 'pending'
                    ? state.deposit.estimatedGasCrypto
                    : state.deposit.usedGasFee,
                )
                  .div(`1e+${feeAsset.precision}`)
                  .toFixed(5)}
                symbol='ETH'
              />
            </Box>
          </Row.Value>
        </Row>
        <Row>
          <Row.Label>
            <Text translation='modals.confirm.deposit.averageApr' />
          </Row.Label>
          <Tag colorScheme='green'>
            <Amount.Percent value={String(apy)} />
          </Tag>
        </Row>
        <Row>
          <Row.Label>
            <Text translation='modals.confirm.deposit.estimatedReturns' />
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat fontWeight='bold' value={annualYieldFiat.toFixed(2)} />
              <Amount.Crypto
                color='gray.500'
                value={annualYieldCrypto.toFixed(5)}
                symbol={asset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
      </Stack>
    </TxStatus>
  )
}
