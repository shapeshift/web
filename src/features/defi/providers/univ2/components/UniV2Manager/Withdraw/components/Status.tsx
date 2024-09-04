import { CheckIcon, CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Button, Link, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import { PairIcons } from 'features/defi/components/PairIcons/PairIcons'
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
import { useSafeTxQuery } from 'hooks/queries/useSafeTx'
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

  useEffect(() => {
    if (tx && tx.status !== 'Pending' && dispatch) {
      dispatch({
        type: UniV2WithdrawActionType.SET_WITHDRAW,
        payload: {
          txStatus: tx.status === 'Confirmed' ? 'success' : 'failed',
          usedGasFeeCryptoPrecision: tx.fee ? fromBaseUnit(tx.fee.value, lpAsset.precision) : '0',
        },
      })
    }
  }, [tx, dispatch, asset0.precision, lpAsset.precision])

  const handleViewPosition = useCallback(() => {
    browserHistory.push('/earn')
  }, [browserHistory])

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  useEffect(() => {
    if (!lpOpportunity) return
    if (state?.withdraw.txStatus === 'success') {
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
    state?.withdraw.txStatus,
    lpAssetId,
    assetId1,
    assetId0,
  ])

  if (!state || !lpOpportunity) return null

  const { statusIcon, statusText, statusBg, statusBody } = (() => {
    // Safe Pending Tx
    if (
      maybeSafeTx?.isSafeTxHash &&
      !maybeSafeTx.transaction?.transactionHash &&
      maybeSafeTx.transaction?.confirmations &&
      maybeSafeTx.transaction.confirmations.length <= maybeSafeTx.transaction.confirmationsRequired
    )
      return {
        statusIcon: null,
        statusText: StatusTextEnum.pending,
        statusBg: 'transparent',
        statusBody: translate('common.safeProposalQueued', {
          currentConfirmations: maybeSafeTx.transaction.confirmations.length,
          confirmationsRequired: maybeSafeTx.transaction.confirmationsRequired,
        }),
      }

    // Safe Success Tx
    if (maybeSafeTx?.transaction?.transactionHash) {
      return {
        statusText: StatusTextEnum.success,
        statusIcon: <CheckIcon color='gray.900' fontSize='xs' />,
        statusBg: 'green.500',
        statusBody: translate('modals.withdraw.status.success', {
          opportunity: lpAsset.symbol,
        }),
      }
    }

    switch (state.withdraw.txStatus) {
      case 'success':
        return {
          statusText: StatusTextEnum.success,
          statusIcon: <CheckIcon color='gray.900' fontSize='xs' />,
          statusBg: 'green.500',
          statusBody: translate('modals.withdraw.status.success', {
            opportunity: lpAsset.symbol,
          }),
        }
      case 'failed':
        return {
          statusText: StatusTextEnum.failed,
          statusIcon: <CloseIcon color='gray.900' fontSize='xs' />,
          statusBg: 'red.500',
          statusBody: translate('modals.withdraw.status.failed'),
        }
      default:
        return {
          statusIcon: null,
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
                  state.withdraw.txStatus === 'pending'
                    ? state.withdraw.estimatedGasCryptoPrecision
                    : state.withdraw.usedGasFeeCryptoPrecision,
                )
                  .times(ethMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(
                  state.withdraw.txStatus === 'pending'
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
            href={`${asset0.explorerTxLink}${state.txid}`}
          >
            {translate('defi.viewOnChain')}
          </Button>
        </Row>
      </Summary>
    </TxStatus>
  )
}
