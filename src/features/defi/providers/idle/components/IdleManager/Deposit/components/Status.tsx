import { ArrowForwardIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons'
import { Box, Link, Stack, Tag } from '@chakra-ui/react'
import { ASSET_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import { TxStatus } from 'features/defi/components/TxStatus/TxStatus'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useContext, useEffect, useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { StatusTextEnum } from 'components/RouteSteps/RouteSteps'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectAssetById,
  selectFirstAccountSpecifierByChainId,
  selectMarketDataById,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import { IdleDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

export const Status = () => {
  const { state, dispatch } = useContext(DepositContext)
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId } = query

  const assetId = state?.opportunity?.underlyingAsset.assetId || 'undefined'

  // TODO: We need to get the fee asset from the Opportunity
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  const vaultAssetId = state?.opportunity?.positionAsset.assetId || 'undefined'
  const vaultAsset = useAppSelector(state => selectAssetById(state, vaultAssetId))

  const accountSpecifier = useAppSelector(state =>
    selectFirstAccountSpecifierByChainId(state, chainId),
  )

  const serializedTxIndex = useMemo(() => {
    if (!(state?.txid && state?.userAddress)) return ''
    return serializeTxIndex(accountSpecifier, state.txid, state.userAddress)
  }, [state?.txid, state?.userAddress, accountSpecifier])
  const confirmedTransaction = useAppSelector(gs => selectTxById(gs, serializedTxIndex))

  useEffect(() => {
    if (confirmedTransaction && confirmedTransaction.status !== 'pending' && dispatch) {
      dispatch({
        type: IdleDepositActionType.SET_DEPOSIT,
        payload: {
          txStatus: confirmedTransaction.status === 'confirmed' ? 'success' : 'failed',
          usedGasFee: confirmedTransaction.fee?.value,
        },
      })
    }
  }, [confirmedTransaction, dispatch])

  const handleViewPosition = () => {
    browserHistory.push('/defi')
  }

  const handleCancel = () => {
    browserHistory.goBack()
  }

  if (!state) return null

  const apy = state.opportunity?.metadata?.apy?.net_apy
  const annualYieldCrypto = bnOrZero(state.deposit?.cryptoAmount).times(bnOrZero(apy))
  const annualYieldFiat = annualYieldCrypto.times(marketData.price)

  let statusIcon: React.ReactElement = <ArrowForwardIcon />
  let statusText = StatusTextEnum.pending
  if (state.deposit.txStatus === 'success') {
    statusText = StatusTextEnum.success
    statusIcon = <CheckIcon color='green' />
  }
  if (state.deposit.txStatus === 'failed') {
    statusText = StatusTextEnum.failed
    statusIcon = <CloseIcon color='red' />
  }

  return (
    <TxStatus
      onClose={handleCancel}
      onContinue={state.deposit.txStatus === 'success' ? handleViewPosition : undefined}
      loading={state.loading}
      statusText={statusText}
      statusIcon={statusIcon}
      continueText='modals.status.position'
      closeText='modals.status.close'
      assets={[
        {
          ...asset,
          cryptoAmount: state.deposit.cryptoAmount,
          fiatAmount: state.deposit.fiatAmount,
        },
        {
          ...vaultAsset,
          cryptoAmount: bnOrZero(state.deposit.cryptoAmount)
            .div(bnOrZero(state.opportunity?.positionAsset.underlyingPerPosition))
            .times(`1e+${asset.precision}`)
            .toString(),
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
          <Row.Value fontWeight='bold'>Idle Finance</Row.Value>
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
