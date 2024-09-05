import { CheckIcon, CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Button, Link, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { Summary } from 'features/defi/components/Summary'
import { TxStatus as TransactionStatus } from 'features/defi/components/TxStatus/TxStatus'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { InterpolationOptions } from 'node-polyglot'
import { useContext, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { StatusTextEnum } from 'components/RouteSteps/RouteSteps'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { useSafeTxQuery } from 'hooks/queries/useSafeTx'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { getTxLink } from 'lib/getTxLink'
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

  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: state?.txid ?? undefined,
    accountId,
  })

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

  const { statusIcon, status, statusText, statusBg, statusBody } = useMemo(() => {
    // Safe Pending Tx
    if (maybeSafeTx?.isQueuedSafeTx)
      return {
        statusIcon: null,
        statusText: [
          'common.safeProposalQueued',
          {
            currentConfirmations: maybeSafeTx?.transaction?.confirmations?.length,
            confirmationsRequired: maybeSafeTx?.transaction?.confirmationsRequired,
          },
        ] as [string, InterpolationOptions],
        status: TxStatus.Pending,
        statusBody: translate('modals.deposit.status.pending'),
        statusBg: 'transparent',
      }

    if (maybeSafeTx?.isExecutedSafeTx) {
      return {
        statusText: StatusTextEnum.success,
        status: TxStatus.Confirmed,
        statusIcon: <CheckIcon color='gray.900' fontSize='xs' />,
        statusBody: translate('modals.deposit.status.success', {
          // This should never be undefined but might as well
          opportunity: earnUserLpOpportunity?.name ?? 'UniSwap V2',
        }),
        statusBg: 'green.500',
      }
    }

    switch (state?.deposit?.txStatus) {
      case 'success':
        return {
          statusText: StatusTextEnum.success,
          status: TxStatus.Confirmed,
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
          status: TxStatus.Failed,
          statusIcon: <CloseIcon color='gray.900' fontSize='xs' />,
          statusBody: translate('modals.deposit.status.failed'),
          statusBg: 'red.500',
        }
      default:
        return {
          statusIcon: null,
          statusText: StatusTextEnum.pending,
          status: TxStatus.Pending,
          statusBody: translate('modals.deposit.status.pending'),
          statusBg: 'transparent',
        }
    }
  }, [
    earnUserLpOpportunity?.name,
    maybeSafeTx?.isExecutedSafeTx,
    maybeSafeTx?.isQueuedSafeTx,
    maybeSafeTx?.transaction?.confirmations?.length,
    maybeSafeTx?.transaction?.confirmationsRequired,
    state?.deposit?.txStatus,
    translate,
  ])

  useEffect(() => {
    if (status !== TxStatus.Pending && dispatch) {
      const usedGasFeeCryptoPrecision = (() => {
        if (maybeSafeTx?.transaction?.gasUsed)
          return fromBaseUnit(maybeSafeTx.transaction.gasUsed, feeAsset.precision)
        if (confirmedTransaction?.fee)
          return fromBaseUnit(confirmedTransaction.fee.value, feeAsset.precision)
        return '0'
      })()
      dispatch({
        type: UniV2DepositActionType.SET_DEPOSIT,
        payload: {
          txStatus: status === TxStatus.Confirmed ? 'success' : 'failed',
          usedGasFeeCryptoPrecision,
        },
      })
    }
  }, [
    confirmedTransaction,
    dispatch,
    feeAsset.precision,
    maybeSafeTx?.transaction?.gasUsed,
    status,
  ])

  const txLink = useMemo(() => {
    if (!feeAsset) return
    if (!state?.txid) return

    if (maybeSafeTx?.transaction?.transactionHash)
      return getTxLink({
        txId: maybeSafeTx.transaction.transactionHash,
        defaultExplorerBaseUrl: feeAsset.explorerTxLink,
        accountId,
        // on-chain Tx
        isSafeTxHash: false,
      })

    return getTxLink({
      txId: state?.txid ?? undefined,
      defaultExplorerBaseUrl: feeAsset.explorerTxLink,
      accountId,
      isSafeTxHash: Boolean(maybeSafeTx?.isSafeTxHash),
    })
  }, [accountId, feeAsset, maybeSafeTx, state?.txid])

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

  return (
    <TransactionStatus
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
            href={txLink}
          >
            {translate('defi.viewOnChain')}
          </Button>
        </Row>
      </Summary>
    </TransactionStatus>
  )
}
