import { CheckIcon, CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Button, Link, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, thorchainAssetId } from '@shapeshiftoss/caip'
import { TxStatus as TxStatusType } from '@shapeshiftoss/unchained-client'
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
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { StatusTextEnum } from 'components/RouteSteps/RouteSteps'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { waitForThorchainUpdate } from 'lib/utils/thorchain'
import { opportunitiesApi } from 'state/slices/opportunitiesSlice/opportunitiesApiSlice'
import {
  selectAssetById,
  selectAssets,
  selectFeeAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppDispatch, useAppSelector } from 'state/store'

import { ThorchainSaversDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type StatusProps = {
  accountId: AccountId | undefined
}

const externalLinkIcon = <ExternalLinkIcon />

export const Status: React.FC<StatusProps> = ({ accountId }) => {
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const { state, dispatch: contextDispatch } = useContext(DepositContext)
  const { history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()

  const appDispatch = useAppDispatch()
  const { getOpportunitiesUserData } = opportunitiesApi.endpoints

  const assets = useAppSelector(selectAssets)
  const assetId = state?.opportunity?.assetId

  const isRunePool = assetId === thorchainAssetId

  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId ?? ''))

  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${assetId}`)

  const feeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )
  const marketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId ?? ''),
  )

  const account = useMemo(() => accountId && fromAccountId(accountId).account, [accountId])

  const serializedTxIndex = useMemo(() => {
    if (!(state?.txid && accountId && account)) return ''
    return serializeTxIndex(accountId, state.txid, account)
  }, [state?.txid, accountId, account])

  const confirmedTransaction = useAppSelector(gs => selectTxById(gs, serializedTxIndex))

  useEffect(() => {
    if (!accountId) return

    if (confirmedTransaction && confirmedTransaction.status !== 'Pending' && contextDispatch) {
      ;(async () => {
        // Skipping outbound detection since there's no outbound tx involved here - as long as the inner swap is confirmed, we're gucci
        const thorchainTxStatus = await waitForThorchainUpdate({
          txId: confirmedTransaction.txid,
          skipOutbound: true,
        }).promise

        if ([TxStatusType.Confirmed, TxStatusType.Failed].includes(thorchainTxStatus)) {
          contextDispatch({
            type: ThorchainSaversDepositActionType.SET_DEPOSIT,
            payload: {
              txStatus: thorchainTxStatus === TxStatusType.Confirmed ? 'success' : 'failed',
            },
          })
        }
      })()
    }
  }, [accountId, appDispatch, confirmedTransaction, contextDispatch, getOpportunitiesUserData])

  const handleViewPosition = useCallback(() => {
    browserHistory.push('/earn')
  }, [browserHistory])

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  useEffect(() => {
    if (!state?.opportunity || !assetId) return
    if (state?.deposit.txStatus === 'success') {
      trackOpportunityEvent(
        MixPanelEvent.DepositSuccess,
        {
          opportunity: state.opportunity,
          fiatAmounts: [state.deposit.fiatAmount],
          cryptoAmounts: [{ assetId, amountCryptoHuman: state.deposit.cryptoAmount }],
        },
        assets,
      )
    }
  }, [
    assets,
    assetId,
    mixpanel,
    state?.opportunity,
    state?.deposit.cryptoAmount,
    state?.deposit.fiatAmount,
    state?.deposit.txStatus,
  ])

  if (!state || !asset) return null

  const { statusIcon, statusText, statusBg, statusBody } = (() => {
    switch (state.deposit.txStatus) {
      case 'success':
        return {
          statusText: StatusTextEnum.success,
          statusIcon: <CheckIcon color='white' />,
          statusBody: translate('modals.deposit.status.success', {
            opportunity: isRunePool ? `RUNEPool` : `${asset.name} Vault`,
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
          statusIcon: <AssetIcon size='xs' src={asset?.icon} />,
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
    >
      <Summary spacing={0} mx={6} mb={4}>
        <Row variant='vert-gutter'>
          <Row.Label>
            <Text translation='modals.confirm.amountToDeposit' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={asset.icon} />
              <RawText>{asset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.deposit.cryptoAmount} symbol={asset.symbol} />
            </Row.Value>
          </Row>
        </Row>
        <Row variant='gutter'>
          {!isRunePool ? (
            <Row.Label>
              <HelperTooltip label={translate('trade.tooltip.protocolFee')}>
                <Text translation={'trade.protocolFee'} />
              </HelperTooltip>
            </Row.Label>
          ) : null}
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(state.deposit.protocolFeeCryptoBaseUnit)
                  .div(bn(10).pow(asset.precision))
                  .times(marketData.price)
                  .toFixed()}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(state.deposit.protocolFeeCryptoBaseUnit)
                  .div(bn(10).pow(asset.precision))
                  .toFixed()}
                symbol={asset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <HelperTooltip label={translate('trade.tooltip.minerFee')}>
              <Text translation={'trade.minerFee'} />
            </HelperTooltip>
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(state.deposit.networkFeeCryptoBaseUnit)
                  .div(bn(10).pow(feeAsset.precision))
                  .times(feeMarketData.price)
                  .toFixed()}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(state.deposit.networkFeeCryptoBaseUnit)
                  .div(bn(10).pow(feeAsset.precision))
                  .toFixed()}
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
            rightIcon={externalLinkIcon}
            href={`${asset.explorerTxLink}${state.txid}`}
          >
            {translate('defi.viewOnChain')}
          </Button>
        </Row>
      </Summary>
    </TxStatus>
  )
}
