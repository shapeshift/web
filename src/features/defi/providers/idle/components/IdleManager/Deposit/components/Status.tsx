import { CheckIcon, CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Button, Link, Stack } from '@chakra-ui/react'
import { ASSET_REFERENCE, fromAccountId, toAssetId } from '@shapeshiftoss/caip'
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
import { bnOrZero } from 'lib/bignumber/bignumber'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvents } from 'lib/mixpanel/types'
import {
  selectAssetById,
  selectAssets,
  selectFirstAccountIdByChainId,
  selectMarketDataById,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import { IdleDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

export const Status = () => {
  const translate = useTranslate()
  const { state, dispatch } = useContext(DepositContext)
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId } = query

  const assets = useAppSelector(selectAssets)
  const assetId = state?.opportunity?.underlyingAssetIds[0] ?? ''

  // TODO: We need to get the fee asset from the Opportunity
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  const accountId = useAppSelector(state => selectFirstAccountIdByChainId(state, chainId))
  const userAddress: string | undefined = accountId && fromAccountId(accountId).account

  const opportunity = state?.opportunity

  const serializedTxIndex = useMemo(() => {
    if (!(state?.txid && userAddress && accountId)) return ''
    return serializeTxIndex(accountId, state.txid, userAddress)
  }, [state?.txid, userAddress, accountId])
  const confirmedTransaction = useAppSelector(gs => selectTxById(gs, serializedTxIndex))

  useEffect(() => {
    if (confirmedTransaction && confirmedTransaction.status !== 'Pending' && dispatch) {
      dispatch({
        type: IdleDepositActionType.SET_DEPOSIT,
        payload: {
          txStatus: confirmedTransaction.status === 'Confirmed' ? 'success' : 'failed',
          usedGasFeeCryptoBaseUnit: confirmedTransaction.fee?.value,
        },
      })
    }
  }, [confirmedTransaction, dispatch])

  const handleViewPosition = useCallback(() => {
    browserHistory.push('/earn')
  }, [browserHistory])

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  useEffect(() => {
    if (!opportunity) return
    if (state?.deposit.txStatus === 'success' && opportunity) {
      trackOpportunityEvent(
        MixPanelEvents.DepositSuccess,
        {
          opportunity,
          fiatAmounts: [state.deposit.fiatAmount],
          cryptoAmounts: [{ assetId, amountCryptoHuman: state.deposit.cryptoAmount }],
        },
        assets,
      )
    }
  }, [
    assetId,
    opportunity,
    state?.deposit.cryptoAmount,
    state?.deposit.fiatAmount,
    state?.deposit.txStatus,
    assets,
  ])

  if (!state) return null

  const { statusIcon, statusText, statusBg, statusBody } = (() => {
    switch (state.deposit.txStatus) {
      case 'success':
        return {
          statusText: StatusTextEnum.success,
          statusIcon: <CheckIcon color='white' />,
          statusBody: translate('modals.deposit.status.success', {
            opportunity: `${asset.name} Vault`,
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
                    ? state.deposit.estimatedGasCryptoBaseUnit
                    : state.deposit.usedGasFeeCryptoBaseUnit,
                )
                  .div(`1e+${feeAsset.precision}`)
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='gray.500'
                value={bnOrZero(
                  state.deposit.txStatus === 'pending'
                    ? state.deposit.estimatedGasCryptoBaseUnit
                    : state.deposit.usedGasFeeCryptoBaseUnit,
                )
                  .div(`1e+${feeAsset.precision}`)
                  .toFixed(5)}
                symbol='ETH'
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
            href={`${asset.explorerTxLink}/${state.txid}`}
          >
            {translate('defi.viewOnChain')}
          </Button>
        </Row>
      </Summary>
    </TxStatus>
  )
}
