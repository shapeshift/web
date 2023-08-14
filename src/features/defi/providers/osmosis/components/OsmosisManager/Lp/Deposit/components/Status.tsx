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

import { OsmosisDepositActionType } from '../LpDepositCommon'
import { DepositContext } from '../LpDepositContext'

type StatusProps = {
  accountId: AccountId | undefined
}

export const Status: React.FC<StatusProps> = ({ accountId }) => {
  const translate = useTranslate()
  const { state, dispatch: contextDispatch } = useContext(DepositContext)
  const { history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const opportunity = state?.opportunity

  const assets = useAppSelector(selectAssets)
  const marketData = useAppSelector(selectSelectedCurrencyMarketDataSortedByMarketCap)

  const feeAsset = useAppSelector(state => selectAssetById(state, osmosisAssetId))
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${osmosisAssetId}`)

  const underlyingAssetBalances = useMemo(() => {
    if (!opportunity || !state) return null
    return getUnderlyingAssetIdsBalances({
      assetId: opportunity.assetId,
      underlyingAssetIds: opportunity.underlyingAssetIds,
      underlyingAssetRatiosBaseUnit: opportunity.underlyingAssetRatiosBaseUnit,
      cryptoAmountBaseUnit: state.deposit.shareOutAmountBaseUnit,
      assets,
      marketData,
    })
  }, [assets, marketData, opportunity, state])

  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataById(state, osmosisAssetId ?? ''),
  )

  const underlyingAsset0 = useAppSelector(state =>
    selectAssetById(state, opportunity?.underlyingAssetIds[0] ?? ''),
  )
  const underlyingAsset1 = useAppSelector(state =>
    selectAssetById(state, opportunity?.underlyingAssetIds[1] ?? ''),
  )
  if (!underlyingAsset0)
    throw new Error(`Asset not found for AssetId ${opportunity?.underlyingAssetIds[0]}`)
  if (!underlyingAsset1)
    throw new Error(`Asset not found for AssetId ${opportunity?.underlyingAssetIds[1]}`)

  const userAddress: string | undefined = accountId && fromAccountId(accountId).account

  const serializedTxIndex = useMemo(() => {
    //TODO(pastaghost): Refactor to eliminate userAddress
    if (!(state?.txid && userAddress && accountId)) return ''
    return serializeTxIndex(accountId, state.txid, userAddress)
  }, [state?.txid, userAddress, accountId])
  const confirmedTransaction = useAppSelector(gs => selectTxById(gs, serializedTxIndex))

  useEffect(() => {
    if (confirmedTransaction && confirmedTransaction.status !== 'Pending' && contextDispatch) {
      contextDispatch({
        type: OsmosisDepositActionType.SET_DEPOSIT,
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
    if (!opportunity || !state || !underlyingAssetBalances) return
    if (state.deposit.txStatus === 'success') {
      trackOpportunityEvent(
        MixPanelEvents.DepositSuccess,
        {
          opportunity,
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
    opportunity,
    state,
    underlyingAsset0.assetId,
    underlyingAsset1.assetId,
    underlyingAssetBalances,
  ])

  if (!state || !feeAsset) return null

  const { statusIcon, statusText, statusBg, statusBody } = (() => {
    switch (state.deposit.txStatus) {
      case 'success':
        return {
          statusText: StatusTextEnum.success,
          statusIcon: <CheckIcon color='white' />,
          statusBody: translate('modals.deposit.status.success', {
            opportunity: opportunity?.name,
          }),
          statusBg: 'green.500',
        }
      case 'failed':
        return {
          statusText: StatusTextEnum.failed,
          statusIcon: <CloseIcon color='white' />,
          statusBody: translate('modals.deposit.status.failed'),
          statusBg: 'red.500',
        }
      default:
        return {
          statusIcon: <AssetIcon size='xs' src={feeAsset?.icon} />,
          statusText: StatusTextEnum.pending,
          statusBody: translate('modals.deposit.status.pending'),
          statusBg: 'transparent',
        }
    }
  })()

  return (
    <TxStatus
      onClose={handleCancel}
      onContinue={state.deposit.txStatus === 'success' ? handleViewPosition : undefined}
      loading={!['success', 'failed'].includes(state.deposit.txStatus)}
      statusText={statusText}
      statusIcon={statusIcon}
      statusBody={statusBody}
      statusBg={statusBg}
      continueText='modals.status.position'
      pairIcons={opportunity?.icons}
    >
      <Summary spacing={0} mx={6} mb={4}>
        <Row variant='vert-gutter'>
          <Row.Label>
            <Text translation='modals.confirm.amountToDeposit' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={underlyingAsset0.icon} />
              <RawText>{underlyingAsset0.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto
                value={bnOrZero(state.deposit.underlyingAsset0.amount)
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
                value={bnOrZero(state.deposit.underlyingAsset1.amount)
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
                  bnOrZero(state?.deposit?.estimatedFeeCryptoBaseUnit)
                    .dividedBy(bn(10).pow(OSMOSIS_PRECISION))
                    .toString(),
                )
                  .times(feeAssetMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(
                  bnOrZero(state?.deposit?.estimatedFeeCryptoBaseUnit)
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
