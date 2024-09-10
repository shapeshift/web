import { CheckIcon, CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Button, Link, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { TxStatus as TxStatusType } from '@shapeshiftoss/unchained-client'
import { Summary } from 'features/defi/components/Summary'
import { TxStatus } from 'features/defi/components/TxStatus/TxStatus'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useContext, useEffect } from 'react'
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
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { ThorchainSaversWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

type StatusProps = {
  accountId: AccountId | undefined
}

const externalLinkIcon = <ExternalLinkIcon />

export const Status: React.FC<StatusProps> = ({ accountId }) => {
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const { state, dispatch: contextDispatch } = useContext(WithdrawContext)
  const { history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const opportunity = state?.opportunity

  const appDispatch = useAppDispatch()
  const { getOpportunitiesUserData } = opportunitiesApi.endpoints

  const assetId = state?.opportunity?.assetId

  const isRunePool = assetId === thorchainAssetId

  const assets = useAppSelector(selectAssets)
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

  useEffect(() => {
    if (!(contextDispatch && state?.txid?.length)) return
    ;(async () => {
      // Ensuring we wait for the outbound Tx to exist
      // Note, the transaction we wait for here is a Thorchain transaction, *not* the inbound Tx
      const thorchainTxStatus = await waitForThorchainUpdate({
        txId: state.txid!,
        skipOutbound: false,
      }).promise

      if ([TxStatusType.Confirmed, TxStatusType.Failed].includes(thorchainTxStatus)) {
        contextDispatch({
          type: ThorchainSaversWithdrawActionType.SET_WITHDRAW,
          payload: {
            txStatus: thorchainTxStatus === TxStatusType.Confirmed ? 'success' : 'failed',
          },
        })
      }
    })()
  }, [accountId, appDispatch, contextDispatch, getOpportunitiesUserData, state?.txid])

  const handleViewPosition = useCallback(() => {
    browserHistory.push('/earn')
  }, [browserHistory])

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  useEffect(() => {
    if (!assetId || !opportunity) return
    if (state?.withdraw.txStatus === 'success') {
      trackOpportunityEvent(
        MixPanelEvent.WithdrawSuccess,
        {
          opportunity,
          fiatAmounts: [state.withdraw.fiatAmount],
          cryptoAmounts: [{ assetId, amountCryptoHuman: state.withdraw.cryptoAmount }],
        },
        assets,
      )
    }
  }, [
    assets,
    assetId,
    mixpanel,
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
            opportunity: `${asset.symbol} Vault`,
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
      onContinue={state.withdraw.txStatus === 'success' ? handleViewPosition : undefined}
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
            <HelperTooltip label={translate('trade.tooltip.protocolFee')}>
              <Text translation={'trade.protocolFee'} />
            </HelperTooltip>
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(state.withdraw.protocolFeeCryptoBaseUnit)
                  .div(bn(10).pow(asset.precision))
                  .times(marketData.price)
                  .toFixed()}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(state.withdraw.protocolFeeCryptoBaseUnit)
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
                value={bnOrZero(state.withdraw.networkFeeCryptoBaseUnit)
                  .div(bn(10).pow(feeAsset.precision))
                  .times(feeMarketData.price)
                  .toFixed()}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(state.withdraw.networkFeeCryptoBaseUnit)
                  .div(bn(10).pow(feeAsset.precision))
                  .toFixed()}
                symbol={feeAsset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
        {!isRunePool ? (
          <Row variant='gutter'>
            <Row.Label>
              <HelperTooltip label={translate('defi.modals.saversVaults.dustAmountTooltip')}>
                <Text translation='defi.modals.saversVaults.dustAmount' />
              </HelperTooltip>
            </Row.Label>
            <Row.Value>
              <Box textAlign='right'>
                <Amount.Fiat
                  fontWeight='bold'
                  value={bnOrZero(state.withdraw.dustAmountCryptoBaseUnit)
                    .div(bn(10).pow(asset.precision))
                    .times(marketData.price)
                    .toFixed()}
                />
                <Amount.Crypto
                  color='text.subtle'
                  value={bnOrZero(state.withdraw.dustAmountCryptoBaseUnit)
                    .div(bn(10).pow(asset.precision))
                    .toFixed()}
                  symbol={asset.symbol}
                />
              </Box>
            </Row.Value>
          </Row>
        ) : null}
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
