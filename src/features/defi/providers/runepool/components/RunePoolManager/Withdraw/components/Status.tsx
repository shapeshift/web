import { CheckIcon, CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Button, Link, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { TxStatus as TxStatusType } from '@shapeshiftoss/unchained-client'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useContext, useEffect } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { RunePoolWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { StatusTextEnum } from '@/components/RouteSteps/RouteSteps'
import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'
import { Summary } from '@/features/defi/components/Summary'
import { TxStatus } from '@/features/defi/components/TxStatus/TxStatus'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { trackOpportunityEvent } from '@/lib/mixpanel/helpers'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { waitForThorchainUpdate } from '@/lib/utils/thorchain'
import { opportunitiesApi } from '@/state/slices/opportunitiesSlice/opportunitiesApiSlice'
import { DefiProvider, DefiType } from '@/state/slices/opportunitiesSlice/types'
import {
  selectAssetById,
  selectAssets,
  selectFeeAssetById,
  selectMarketDataByAssetIdUserCurrency,
} from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

type StatusProps = {
  accountId: AccountId | undefined
}

const externalLinkIcon = <ExternalLinkIcon />

export const Status: React.FC<StatusProps> = ({ accountId }) => {
  const translate = useTranslate()
  const { state, dispatch: contextDispatch } = useContext(WithdrawContext)
  const opportunity = state?.opportunity
  const navigate = useNavigate()

  const appDispatch = useAppDispatch()
  const { getOpportunitiesUserData } = opportunitiesApi.endpoints

  const assetId = state?.opportunity?.assetId

  const assets = useAppSelector(selectAssets)
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId ?? ''))

  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${assetId}`)

  const feeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )

  useEffect(() => {
    if (!(contextDispatch && state?.txid?.length && accountId)) return
    ;(async () => {
      if (!state.txid) return

      const thorchainTxStatus = await waitForThorchainUpdate({
        txId: state.txid,
        // RUNEPool has no outbound Tx so we skipOutbound, else this will spin to infinity
        skipOutbound: true,
      }).promise

      if ([TxStatusType.Confirmed, TxStatusType.Failed].includes(thorchainTxStatus)) {
        if (thorchainTxStatus === TxStatusType.Confirmed) {
          appDispatch(
            getOpportunitiesUserData.initiate(
              [
                {
                  accountId,
                  defiProvider: DefiProvider.RunePool,
                  defiType: DefiType.Staking,
                },
              ],
              { forceRefetch: true },
            ),
          )
        }

        contextDispatch({
          type: RunePoolWithdrawActionType.SET_WITHDRAW,
          payload: {
            txStatus: thorchainTxStatus === TxStatusType.Confirmed ? 'success' : 'failed',
          },
        })
      }
    })()
  }, [accountId, appDispatch, contextDispatch, getOpportunitiesUserData, state?.txid])

  const handleViewPosition = useCallback(() => {
    if (!accountId) return
    // The full-page earn dashboard is mobile-only - the account page shows the position on both layouts
    navigate(`/accounts/${accountId}`)
  }, [accountId, navigate])

  const handleCancel = useCallback(() => {
    navigate(-1)
  }, [navigate])

  useEffect(() => {
    if (!assetId || !opportunity) return
    if (state?.withdraw.txStatus === 'success') {
      trackOpportunityEvent(
        MixPanelEvent.WithdrawSuccess,
        {
          opportunity,
          fiatAmounts: [state.withdraw.fiatAmount],
          cryptoAmounts: [{ assetId, amountCryptoPrecision: state.withdraw.cryptoAmount }],
        },
        assets,
      )
    }
  }, [
    assets,
    assetId,
    opportunity,
    state?.withdraw.cryptoAmount,
    state?.withdraw.fiatAmount,
    state?.withdraw.txStatus,
  ])

  if (!(state && asset)) return null

  const { statusIcon, statusText, statusBg, statusBody } = (() => {
    switch (state.withdraw.txStatus) {
      case 'success':
        return {
          statusText: StatusTextEnum.success,
          statusIcon: <CheckIcon color='white' />,
          statusBg: 'green.500',
          statusBody: translate('modals.withdraw.status.success', {
            opportunity: 'RUNEPool',
          }),
        }
      case 'failed':
        return {
          statusText: StatusTextEnum.failed,
          statusIcon: <CloseIcon color='white' />,
          statusBg: 'red.500',
          statusBody: translate('modals.withdraw.status.failed'),
        }
      default:
        return {
          statusIcon: <AssetIcon size='xs' src={asset?.icon} justifyContent='center' />,
          statusText: StatusTextEnum.pending,
          statusBg: 'transparent',
          statusBody: translate('modals.withdraw.status.pending'),
        }
    }
  })()

  return (
    <TxStatus
      onClose={handleCancel}
      onContinue={
        state.withdraw.txStatus === 'success' && accountId ? handleViewPosition : undefined
      }
      loading={!['success', 'failed'].includes(state.withdraw.txStatus)}
      continueText='modals.status.position'
      statusText={statusText}
      statusIcon={statusIcon}
      statusBg={statusBg}
      statusBody={statusBody}
    >
      <Summary spacing={0} mx={6} mb={4}>
        <Row variant='vert-gutter'>
          <Row.Label>
            <Text translation='modals.confirm.amountToWithdraw' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={asset.icon} />
              <RawText>{asset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.cryptoAmount} symbol={asset.symbol} />
            </Row.Value>
          </Row>
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
                value={bnOrZero(
                  BigAmount.fromBaseUnit({
                    value: state.withdraw.networkFeeCryptoBaseUnit ?? '0',
                    precision: feeAsset.precision,
                  }).toPrecision(),
                )
                  .times(bnOrZero(feeMarketData?.price))
                  .toFixed()}
              />
              <Amount.Crypto
                color='text.subtle'
                value={BigAmount.fromBaseUnit({
                  value: state.withdraw.networkFeeCryptoBaseUnit ?? '0',
                  precision: feeAsset.precision,
                }).toPrecision()}
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
