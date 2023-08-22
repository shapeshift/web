import { CheckIcon, CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Button, Link, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, osmosisAssetId } from '@shapeshiftoss/caip'
import { Summary } from 'features/defi/components/Summary'
import { TxStatus } from 'features/defi/components/TxStatus/TxStatus'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { StatusTextEnum } from 'components/RouteSteps/RouteSteps'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { OSMOSIS_PRECISION } from 'state/slices/opportunitiesSlice/resolvers/osmosis/utils'
import { getUnderlyingAssetIdsBalances } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectMarketDataById,
  selectSelectedCurrencyMarketDataSortedByMarketCap,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import { OsmosisWithdrawActionType } from '../LpWithdrawCommon'
import { WithdrawContext } from '../LpWithdrawContext'

type StatusProps = { accountId: AccountId | undefined } & StepComponentProps

export const Status: React.FC<StatusProps> = ({ accountId }) => {
  const translate = useTranslate()
  const { state, dispatch: contextDispatch } = useContext(WithdrawContext)
  const { history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const osmosisOpportunity = state?.opportunity

  const assets = useAppSelector(selectAssets)
  const marketData = useAppSelector(selectSelectedCurrencyMarketDataSortedByMarketCap)
  const feeAsset = useAppSelector(state => selectAssetById(state, osmosisAssetId))
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${osmosisAssetId}`)
  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, osmosisAssetId ?? ''),
  )

  const underlyingAssetBalances = useMemo(() => {
    if (!osmosisOpportunity || !state) return null
    return getUnderlyingAssetIdsBalances({
      assetId: osmosisOpportunity.assetId,
      underlyingAssetIds: osmosisOpportunity.underlyingAssetIds,
      underlyingAssetRatiosBaseUnit: osmosisOpportunity.underlyingAssetRatiosBaseUnit,
      cryptoAmountBaseUnit: state.withdraw.shareInAmountBaseUnit,
      assets,
      marketData,
    })
  }, [assets, marketData, osmosisOpportunity, state])

  const lpAsset = useAppSelector(state => selectAssetById(state, osmosisOpportunity?.assetId ?? ''))

  const underlyingAsset0 = useAppSelector(state =>
    selectAssetById(state, osmosisOpportunity?.underlyingAssetIds[0] ?? ''),
  )
  const underlyingAsset1 = useAppSelector(state =>
    selectAssetById(state, osmosisOpportunity?.underlyingAssetIds[1] ?? ''),
  )
  if (!underlyingAsset0)
    throw new Error(`Asset not found for AssetId ${osmosisOpportunity?.underlyingAssetIds[0]}`)
  if (!underlyingAsset1)
    throw new Error(`Asset not found for AssetId ${osmosisOpportunity?.underlyingAssetIds[1]}`)

  const userAddress: string | undefined = accountId && fromAccountId(accountId).account

  const serializedTxIndex = useMemo(() => {
    // TODO:pastaghost): refactor to eliminate userAddress parameter
    if (!(state?.txid && userAddress && accountId)) return ''
    return serializeTxIndex(accountId, state.txid, userAddress)
  }, [state?.txid, userAddress, accountId])
  const confirmedTransaction = useAppSelector(gs => selectTxById(gs, serializedTxIndex))

  useEffect(() => {
    if (confirmedTransaction && confirmedTransaction.status !== 'Pending' && contextDispatch) {
      contextDispatch({
        type: OsmosisWithdrawActionType.SET_WITHDRAW,
        payload: {
          txStatus: confirmedTransaction.status === 'Confirmed' ? 'success' : 'failed',
          usedGasFee: confirmedTransaction.fee?.value,
        },
      })
    }
  }, [confirmedTransaction, contextDispatch])

  const handleViewPosition = useCallback(() => {
    browserHistory.push('/earn')
  }, [browserHistory])

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  useEffect(() => {
    if (
      !osmosisOpportunity ||
      !lpAsset ||
      !state ||
      !underlyingAsset0 ||
      !underlyingAsset1 ||
      !underlyingAssetBalances
    )
      return
    if (state.withdraw.txStatus === 'success') {
      trackOpportunityEvent(
        MixPanelEvents.WithdrawSuccess,
        {
          opportunity: osmosisOpportunity,
          fiatAmounts: [
            underlyingAssetBalances[underlyingAsset0.assetId].fiatAmount,
            underlyingAssetBalances[underlyingAsset1.assetId].fiatAmount,
          ],
          cryptoAmounts: [
            {
              assetId: underlyingAsset0.assetId,
              amountCryptoHuman:
                underlyingAssetBalances[underlyingAsset0.assetId].cryptoBalancePrecision,
            },
            {
              assetId: underlyingAsset1.assetId,
              amountCryptoHuman:
                underlyingAssetBalances[underlyingAsset1.assetId].cryptoBalancePrecision,
            },
          ],
        },
        assets,
      )
    }
  }, [
    assets,
    lpAsset,
    osmosisOpportunity,
    state,
    underlyingAsset0,
    underlyingAsset1,
    underlyingAssetBalances,
  ])

  if (!state || !osmosisOpportunity) return null

  const { statusIcon, statusText, statusBg, statusBody } = (() => {
    switch (state.withdraw.txStatus) {
      case 'success':
        return {
          statusText: StatusTextEnum.success,
          statusIcon: <CheckIcon color='white' />,
          statusBody: translate('modals.withdraw.status.success', {
            opportunity: osmosisOpportunity?.name,
          }),
          statusBg: 'green.500',
        }
      case 'failed':
        return {
          statusText: StatusTextEnum.failed,
          statusIcon: <CloseIcon color='white' />,
          statusBody: translate('modals.withdraw.status.failed'),
          statusBg: 'red.500',
        }
      default:
        return {
          statusIcon: <AssetIcon size='xs' src={feeAsset?.icon} />,
          statusText: StatusTextEnum.pending,
          statusBody: translate('modals.withdraw.status.pending'),
          statusBg: 'transparent',
        }
    }
  })()

  return (
    <TxStatus
      onClose={handleCancel}
      onContinue={state.withdraw.txStatus === 'success' ? handleViewPosition : undefined}
      loading={!['success', 'failed'].includes(state.withdraw.txStatus)}
      statusText={statusText}
      statusIcon={statusIcon}
      statusBody={statusBody}
      statusBg={statusBg}
      continueText='modals.status.position'
      pairIcons={osmosisOpportunity?.icons}
    >
      <Summary spacing={0} mx={6} mb={4}>
        <Row variant='vert-gutter'>
          <Row.Label>
            <Text translation='modals.confirm.amountToWithdraw' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={underlyingAsset0.icon} />
              <RawText>{underlyingAsset0.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto
                value={bnOrZero(state.withdraw.underlyingAsset0.amount)
                  .dividedBy(bn(10).pow(underlyingAsset0.precision))
                  .toString()}
                symbol={underlyingAsset0.symbol}
              />
            </Row.Value>
          </Row>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={underlyingAsset1.icon} />
              <RawText>{underlyingAsset1.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto
                value={bnOrZero(state.withdraw.underlyingAsset1.amount)
                  .dividedBy(bn(10).pow(underlyingAsset1.precision))
                  .toString()}
                symbol={underlyingAsset1.symbol}
              />
            </Row.Value>
          </Row>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <Text
              translation={
                state.withdraw.txStatus === 'pending'
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
                  bnOrZero(state?.withdraw?.estimatedFeeCryptoBaseUnit)
                    .dividedBy(bn(10).pow(OSMOSIS_PRECISION))
                    .toString(),
                )
                  .times(feeAssetMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(
                  bnOrZero(state?.withdraw?.estimatedFeeCryptoBaseUnit)
                    .dividedBy(bn(10).pow(OSMOSIS_PRECISION))
                    .toString(),
                ).toFixed(5)}
                symbol={feeAsset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
        <Row variant='gutter'>
          <Button
            as={Link}
            width='full'
            isExternal
            variant='ghost-filled'
            colorScheme='green'
            rightIcon={<ExternalLinkIcon />}
            href={`${feeAsset.explorerTxLink}${state.txid}`}
          >
            {translate('defi.viewOnChain')}
          </Button>
        </Row>
      </Summary>
    </TxStatus>
  )
}
