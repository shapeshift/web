import { CheckIcon, CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Button, Link, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { PairIcons } from 'features/defi/components/PairIcons/PairIcons'
import { Summary } from 'features/defi/components/Summary'
import { TxStatus as TransactionStatus } from 'features/defi/components/TxStatus/TxStatus'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback, useContext, useEffect, useMemo } from 'react'
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
  selectFeeAssetByChainId,
  selectMarketDataByAssetIdUserCurrency,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import { UniV2WithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

type StatusProps = { accountId: AccountId | undefined }
const externalLinkIcon = <ExternalLinkIcon />

export const Status: React.FC<StatusProps> = ({ accountId }) => {
  const translate = useTranslate()
  const { state, dispatch } = useContext(WithdrawContext)
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query

  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: state?.txid ?? undefined,
    accountId,
  })

  const lpAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const lpOpportunityFilter = useMemo(
    () => ({
      lpId: lpAssetId as LpId,
      assetId: lpAssetId,
      accountId,
    }),
    [accountId, lpAssetId],
  )
  const lpOpportunity = useAppSelector(state =>
    selectEarnUserLpOpportunity(state, lpOpportunityFilter),
  )

  const { history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()

  const assetId0 = lpOpportunity?.underlyingAssetIds[0] ?? ''
  const assetId1 = lpOpportunity?.underlyingAssetIds[1] ?? ''
  const asset0 = useAppSelector(state => selectAssetById(state, assetId0))
  const asset1 = useAppSelector(state => selectAssetById(state, assetId1))
  const lpAsset = useAppSelector(state => selectAssetById(state, lpAssetId))
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))
  const assets = useAppSelector(selectAssets)

  if (!asset0) throw new Error(`Asset not found for AssetId ${assetId0}`)
  if (!asset1) throw new Error(`Asset not found for AssetId ${assetId1}`)
  if (!lpAsset) throw new Error(`Asset not found for AssetId ${lpAssetId}`)

  const ethMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, ethAssetId),
  )

  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : null),
    [accountId],
  )

  const serializedTxIndex = useMemo(() => {
    if (!(state?.txid && accountAddress && accountId)) return ''
    return serializeTxIndex(accountId, state.txid, accountAddress)
  }, [state?.txid, accountAddress, accountId])
  const tx = useAppSelector(gs => selectTxById(gs, serializedTxIndex))

  const handleViewPosition = useCallback(() => {
    browserHistory.push('/earn')
  }, [browserHistory])

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  const { statusIcon, status, statusText, statusBg, statusBody } = useMemo(() => {
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
        statusBg: 'transparent',
        statusBody: translate('common.safeProposalQueued', {
          currentConfirmations: maybeSafeTx?.transaction?.confirmations?.length,
          confirmationsRequired: maybeSafeTx?.transaction?.confirmationsRequired,
        }),
      }

    if (maybeSafeTx?.isExecutedSafeTx) {
      return {
        statusText: StatusTextEnum.success,
        status: TxStatus.Confirmed,
        statusIcon: <CheckIcon color='gray.900' fontSize='xs' />,
        statusBg: 'green.500',
        statusBody: translate('modals.withdraw.status.success', {
          opportunity: lpAsset.symbol,
        }),
      }
    }

    switch (tx?.status) {
      case TxStatus.Confirmed:
        return {
          statusText: StatusTextEnum.success,
          status: TxStatus.Confirmed,
          statusIcon: <CheckIcon color='gray.900' fontSize='xs' />,
          statusBg: 'green.500',
          statusBody: translate('modals.withdraw.status.success', {
            opportunity: lpAsset.symbol,
          }),
        }
      case TxStatus.Failed:
        return {
          statusText: StatusTextEnum.failed,
          status: TxStatus.Failed,
          statusIcon: <CloseIcon color='gray.900' fontSize='xs' />,
          statusBg: 'red.500',
          statusBody: translate('modals.withdraw.status.failed'),
        }
      default:
        return {
          statusIcon: null,
          statusText: StatusTextEnum.pending,
          status: TxStatus.Pending,
          statusBg: 'transparent',
          statusBody: translate('modals.withdraw.status.pending'),
        }
    }
  }, [
    maybeSafeTx?.isQueuedSafeTx,
    maybeSafeTx?.transaction?.confirmations?.length,
    maybeSafeTx?.transaction?.confirmationsRequired,
    maybeSafeTx?.isExecutedSafeTx,
    translate,
    tx?.status,
    lpAsset.symbol,
  ])

  useEffect(() => {
    if (!lpOpportunity) return
    if (!state) return

    if (status === TxStatus.Confirmed) {
      trackOpportunityEvent(
        MixPanelEvent.WithdrawSuccess,
        {
          opportunity: lpOpportunity,
          fiatAmounts: [state?.withdraw.lpFiatAmount],
          cryptoAmounts: [
            { assetId: lpAssetId, amountCryptoHuman: state?.withdraw.lpAmount },
            { assetId: assetId0, amountCryptoHuman: state.withdraw.asset0Amount },
            { assetId: assetId1, amountCryptoHuman: state.withdraw.asset1Amount },
          ],
        },
        assets,
      )
    }
  }, [
    assets,
    lpOpportunity,
    lpAsset.assetId,
    state?.withdraw.asset0Amount,
    state?.withdraw.asset1Amount,
    state?.withdraw.lpAmount,
    state?.withdraw.lpFiatAmount,
    lpAssetId,
    assetId1,
    assetId0,
    state,
    status,
  ])

  useEffect(() => {
    if (!feeAsset || !(tx || maybeSafeTx)) return

    if (status !== TxStatus.Pending && dispatch) {
      const usedGasFeeCryptoPrecision = (() => {
        if (maybeSafeTx?.transaction?.gasUsed)
          return fromBaseUnit(maybeSafeTx.transaction.gasUsed, feeAsset.precision)
        if (tx?.fee) return fromBaseUnit(tx.fee.value, lpAsset.precision)
        return '0'
      })()
      dispatch({
        type: UniV2WithdrawActionType.SET_WITHDRAW,
        payload: {
          txStatus: status === TxStatus.Confirmed ? 'success' : 'failed',
          usedGasFeeCryptoPrecision,
        },
      })
    }
  }, [
    tx,
    dispatch,
    asset0.precision,
    lpAsset.precision,
    statusText,
    maybeSafeTx?.transaction?.gasUsed,
    feeAsset?.precision,
    feeAsset,
    maybeSafeTx,
    status,
  ])

  const txLink = useMemo(() => {
    if (!feeAsset) return
    if (!state?.txid) return

    return getTxLink({
      txId: state?.txid ?? undefined,
      defaultExplorerBaseUrl: feeAsset.explorerTxLink,
      accountId,
      maybeSafeTx,
    })
  }, [accountId, feeAsset, maybeSafeTx, state?.txid])

  if (!state || !lpOpportunity) return null

  return (
    <TransactionStatus
      onClose={handleCancel}
      onContinue={status === TxStatus.Confirmed ? handleViewPosition : undefined}
      loading={!['success', 'failed'].includes(state.withdraw.txStatus)}
      continueText='modals.status.position'
      statusText={statusText}
      statusIcon={statusIcon}
      statusBg={statusBg}
      statusBody={statusBody}
      pairIcons={lpOpportunity.icons}
    >
      <Summary spacing={0} mx={6} mb={4}>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='modals.confirm.amountToWithdraw' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <PairIcons
                icons={lpOpportunity.icons!}
                iconBoxSize='5'
                h='38px'
                p={1}
                borderRadius={8}
              />
              <RawText>{lpAsset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.lpAmount} symbol={lpAsset.symbol} />
            </Row.Value>
          </Row>
        </Row>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='common.receive' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={asset1.icon} />
              <RawText>{asset1.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.asset1Amount} symbol={asset1.symbol} />
            </Row.Value>
          </Row>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={asset0.icon} />
              <RawText>{asset0.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.asset0Amount} symbol={asset0.symbol} />
            </Row.Value>
          </Row>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <Text
              translation={
                statusText === StatusTextEnum.pending
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
                  statusText === StatusTextEnum.pending
                    ? state.withdraw.estimatedGasCryptoPrecision
                    : state.withdraw.usedGasFeeCryptoPrecision,
                )
                  .times(ethMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(
                  statusText === StatusTextEnum.pending
                    ? state.withdraw.estimatedGasCryptoPrecision
                    : state.withdraw.usedGasFeeCryptoPrecision,
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
