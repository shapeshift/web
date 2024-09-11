import { CheckIcon, CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Button, Link, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { PairIcons } from 'features/defi/components/PairIcons/PairIcons'
import { Summary } from 'features/defi/components/Summary'
import { TxStatus as TransactionStatus } from 'features/defi/components/TxStatus/TxStatus'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { StatusTextEnum } from 'components/RouteSteps/RouteSteps'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useSafeTxQuery } from 'hooks/queries/useSafeTx'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { getTxLink } from 'lib/getTxLink'
import { fromBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAggregatedEarnUserStakingOpportunityByStakingId,
  selectAssetById,
  selectAssets,
  selectMarketDataByAssetIdUserCurrency,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import { FoxFarmingDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type StatusProps = { accountId: AccountId | undefined }
const externalLinkIcon = <ExternalLinkIcon />

export const Status: React.FC<StatusProps> = ({ accountId }) => {
  const translate = useTranslate()
  const { state, dispatch } = useContext(DepositContext)
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { assetNamespace, chainId, contractAddress } = query

  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: state?.txid ?? undefined,
    accountId,
  })

  const feeAssetId = getChainAdapterManager().get(chainId)?.getFeeAssetId()
  if (!feeAssetId) throw new Error(`Cannot get fee AssetId for chainId ${chainId}`)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  const foxFarmingOpportunityFilter = useMemo(
    () => ({
      stakingId: toOpportunityId({
        assetNamespace,
        assetReference: contractAddress,
        chainId,
      }),
    }),
    [assetNamespace, chainId, contractAddress],
  )
  const foxFarmingOpportunity = useAppSelector(state =>
    selectAggregatedEarnUserStakingOpportunityByStakingId(state, foxFarmingOpportunityFilter),
  )

  const history = useHistory()
  const { history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()

  const assets = useAppSelector(selectAssets)
  const asset = useAppSelector(state =>
    selectAssetById(state, foxFarmingOpportunity?.underlyingAssetId ?? ''),
  )
  const feeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAssetId),
  )

  if (!asset)
    throw new Error(`Asset not found for AssetId ${foxFarmingOpportunity?.underlyingAssetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  const handleViewPosition = useCallback(() => {
    browserHistory.push('/earn')
  }, [browserHistory])

  const handleCancel = history.goBack

  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : null),
    [accountId],
  )

  const serializedTxIndex = useMemo(() => {
    if (!(state?.txid && accountId && accountAddress)) return ''
    return serializeTxIndex(accountId, state.txid, accountAddress)
  }, [state?.txid, accountAddress, accountId])

  const confirmedTransaction = useAppSelector(gs => selectTxById(gs, serializedTxIndex))

  const { statusIcon, status, statusText, statusBg, statusBody } = useMemo(() => {
    if (maybeSafeTx?.isQueuedSafeTx)
      return {
        statusIcon: null,
        statusText: StatusTextEnum.pending,
        status: TxStatus.Pending,
        statusBody: translate('common.safeProposalQueued', {
          currentConfirmations: maybeSafeTx?.transaction?.confirmations?.length,
          confirmationsRequired: maybeSafeTx?.transaction?.confirmationsRequired,
        }),
        statusBg: 'transparent',
      }

    if (maybeSafeTx?.isExecutedSafeTx)
      return {
        statusText: StatusTextEnum.success,
        status: TxStatus.Confirmed,
        statusIcon: <CheckIcon color='gray.900' fontSize='xs' />,
        statusBody: translate('modals.deposit.status.success', {
          opportunity: foxFarmingOpportunity?.opportunityName,
        }),
        statusBg: 'green.500',
      }

    switch (confirmedTransaction?.status) {
      case TxStatus.Confirmed:
        return {
          statusText: StatusTextEnum.success,
          status: TxStatus.Confirmed,
          statusIcon: <CheckIcon color='gray.900' fontSize='xs' />,
          statusBody: translate('modals.deposit.status.success', {
            opportunity: foxFarmingOpportunity?.opportunityName,
          }),
          statusBg: 'green.500',
        }
      case TxStatus.Failed:
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
    confirmedTransaction?.status,
    foxFarmingOpportunity?.opportunityName,
    maybeSafeTx?.isExecutedSafeTx,
    maybeSafeTx?.isQueuedSafeTx,
    maybeSafeTx?.transaction?.confirmations?.length,
    maybeSafeTx?.transaction?.confirmationsRequired,
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
        type: FoxFarmingDepositActionType.SET_DEPOSIT,
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

  useEffect(() => {
    if (!foxFarmingOpportunity) return
    if (!state) return
    if (status === TxStatus.Confirmed) {
      trackOpportunityEvent(
        MixPanelEvent.DepositSuccess,
        {
          opportunity: foxFarmingOpportunity,
          fiatAmounts: [state.deposit.fiatAmount],
          cryptoAmounts: [
            { assetId: asset.assetId, amountCryptoHuman: state.deposit.cryptoAmount },
          ],
        },
        assets,
      )
    }
  }, [
    asset.assetId,
    assets,
    foxFarmingOpportunity,
    state,
    state?.deposit.cryptoAmount,
    state?.deposit.fiatAmount,
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

  if (!state || !dispatch || !foxFarmingOpportunity) return null

  return (
    <TransactionStatus
      onClose={handleCancel}
      onContinue={status === TxStatus.Confirmed ? handleViewPosition : undefined}
      loading={![TxStatus.Confirmed, TxStatus.Failed].includes(status)}
      statusText={statusText}
      statusIcon={statusIcon}
      statusBody={statusBody}
      statusBg={statusBg}
      continueText='modals.status.position'
      pairIcons={foxFarmingOpportunity?.icons}
    >
      <Summary>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text
              translation={
                status === TxStatus.Pending
                  ? 'modals.confirm.amountToDeposit'
                  : 'modals.confirm.amountDeposited'
              }
            />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <PairIcons
                icons={foxFarmingOpportunity?.icons!}
                iconBoxSize='5'
                h='38px'
                p={1}
                borderRadius={8}
              />
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
                status === TxStatus.Pending ? 'modals.status.estimatedGas' : 'modals.status.gasUsed'
              }
            />
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(
                  status === TxStatus.Pending
                    ? state.deposit.estimatedGasCryptoPrecision
                    : state.deposit.usedGasFeeCryptoPrecision,
                )
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(
                  status === TxStatus.Pending
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
