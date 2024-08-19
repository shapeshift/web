import { CheckIcon, CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Button, Link, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import { Summary } from 'features/defi/components/Summary'
import { TxStatus } from 'features/defi/components/TxStatus/TxStatus'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useContext, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { StatusTextEnum } from 'components/RouteSteps/RouteSteps'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvent } from 'lib/mixpanel/types'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserLpOpportunity,
  selectMarketDataByAssetIdUserCurrency,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import { UniV2DepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type StatusProps = { accountId: AccountId | undefined }

const externalLinkIcon = <ExternalLinkIcon />

export const Status: React.FC<StatusProps> = ({ accountId }) => {
  const translate = useTranslate()
  const { state, dispatch } = useContext(DepositContext)
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query

  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : null),
    [accountId],
  )

  const lpAssetId = toAssetId({ chainId, assetNamespace, assetReference })

  const earnUserLpOpportunityFilter = useMemo(
    () => ({
      lpId: lpAssetId as LpId,
      assetId: lpAssetId,
      accountId,
    }),
    [accountId, lpAssetId],
  )
  const earnUserLpOpportunity = useAppSelector(state =>
    selectEarnUserLpOpportunity(state, earnUserLpOpportunityFilter),
  )

  const assetId0 = earnUserLpOpportunity?.underlyingAssetIds[0] ?? ''
  const assetId1 = earnUserLpOpportunity?.underlyingAssetIds[1] ?? ''

  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })
  const asset1 = useAppSelector(state => selectAssetById(state, assetId1))
  const asset0 = useAppSelector(state => selectAssetById(state, assetId0))
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const assets = useAppSelector(selectAssets)
  if (!asset1) throw new Error(`Asset not found for AssetId ${assetId1}`)
  if (!asset0) throw new Error(`Asset not found for AssetId ${assetId0}`)
  if (!feeAsset) throw new Error(`Asset not found for AssetId ${feeAssetId}`)

  const feeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAssetId),
  )

  const serializedTxIndex = useMemo(() => {
    if (!(state?.txid && accountAddress && accountId)) return ''
    return serializeTxIndex(accountId, state.txid, accountAddress)
  }, [state?.txid, accountAddress, accountId])
  const confirmedTransaction = useAppSelector(gs => selectTxById(gs, serializedTxIndex))

  useEffect(() => {
    if (confirmedTransaction && confirmedTransaction.status !== 'Pending' && dispatch) {
      dispatch({
        type: UniV2DepositActionType.SET_DEPOSIT,
        payload: {
          txStatus: confirmedTransaction.status === 'Confirmed' ? 'success' : 'failed',
          usedGasFeeCryptoPrecision: confirmedTransaction.fee
            ? fromBaseUnit(confirmedTransaction.fee.value, feeAsset.precision)
            : '0',
        },
      })
    }
  }, [confirmedTransaction, dispatch, feeAsset.precision])

  const handleViewPosition = () => {
    browserHistory.push('/earn')
  }

  const handleCancel = browserHistory.goBack

  useEffect(() => {
    if (!earnUserLpOpportunity) return
    if (state?.deposit.txStatus === 'success') {
      trackOpportunityEvent(
        MixPanelEvent.DepositSuccess,
        {
          opportunity: earnUserLpOpportunity,
          fiatAmounts: [state.deposit.asset0FiatAmount, state.deposit.asset1FiatAmount],
          cryptoAmounts: [
            { assetId: assetId0, amountCryptoHuman: state.deposit.asset0CryptoAmount },
            { assetId: assetId1, amountCryptoHuman: state.deposit.asset1CryptoAmount },
          ],
        },
        assets,
      )
    }
  }, [
    assetId0,
    assetId1,
    assets,
    earnUserLpOpportunity,
    state?.deposit.asset0CryptoAmount,
    state?.deposit.asset0FiatAmount,
    state?.deposit.asset1CryptoAmount,
    state?.deposit.asset1FiatAmount,
    state?.deposit.txStatus,
  ])

  if (!state) return null

  const { statusIcon, statusText, statusBg, statusBody } = (() => {
    switch (state.deposit.txStatus) {
      case 'success':
        return {
          statusText: StatusTextEnum.success,
          statusIcon: <CheckIcon color='gray.900' fontSize='xs' />,
          statusBody: translate('modals.deposit.status.success', {
            // This should never be undefined but might as well
            opportunity: earnUserLpOpportunity?.name ?? 'UniSwap V2',
          }),
          statusBg: 'green.500',
        }
      case 'failed':
        return {
          statusText: StatusTextEnum.failed,
          statusIcon: <CloseIcon color='gray.900' fontSize='xs' />,
          statusBody: translate('modals.deposit.status.failed'),
          statusBg: 'red.500',
        }
      default:
        return {
          statusIcon: null,
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
      pairIcons={earnUserLpOpportunity?.icons}
    >
      <Summary spacing={0} mx={6} mb={4}>
        <Row variant='vert-gutter'>
          <Row.Label>
            <Text
              translation={
                state.deposit.txStatus === 'pending'
                  ? 'modals.confirm.amountToDeposit'
                  : 'modals.confirm.amountDeposited'
              }
            />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={asset1.icon} />
              <RawText>{asset1.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.deposit.asset1CryptoAmount} symbol={asset1.symbol} />
            </Row.Value>
          </Row>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={asset0.icon} />
              <RawText>{asset0.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.deposit.asset0CryptoAmount} symbol={asset0.symbol} />
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
                    ? state.deposit.estimatedGasCryptoPrecision
                    : state.deposit.usedGasFeeCryptoPrecision,
                )
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(
                  state.deposit.txStatus === 'pending'
                    ? state.deposit.estimatedGasCryptoPrecision
                    : state.deposit.usedGasFeeCryptoPrecision,
                ).toFixed(5)}
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
            rightIcon={externalLinkIcon}
            href={`${asset0.explorerTxLink}${state.txid}`}
          >
            {translate('defi.viewOnChain')}
          </Button>
        </Row>
      </Summary>
    </TxStatus>
  )
}
