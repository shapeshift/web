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
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectMarketDataByAssetIdUserCurrency,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import { FoxFarmingWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

type StatusProps = {
  accountId: AccountId | undefined
}

const externalLinkIcon = <ExternalLinkIcon />

export const Status: React.FC<StatusProps> = ({ accountId }) => {
  const translate = useTranslate()
  const { state, dispatch } = useContext(WithdrawContext)

  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { assetNamespace, chainId, contractAddress } = query

  const { data: maybeSafeTx } = useSafeTxQuery({
    maybeSafeTxHash: state?.txid ?? undefined,
    accountId,
  })

  const assets = useAppSelector(selectAssets)

  const opportunity = useAppSelector(state =>
    selectEarnUserStakingOpportunityByUserStakingId(state, {
      userStakingId: serializeUserStakingId(
        accountId ?? '',
        toOpportunityId({
          chainId,
          assetNamespace,
          assetReference: contractAddress,
        }),
      ),
    }),
  )

  const history = useHistory()
  const { history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()

  const asset = useAppSelector(state =>
    selectAssetById(state, opportunity?.underlyingAssetId ?? ''),
  )
  const feeAssetId = getChainAdapterManager().get(chainId)?.getFeeAssetId()
  if (!feeAssetId) throw new Error(`Fee AssetId not found for ChainId ${chainId}`)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  if (!feeAsset) throw new Error(`Asset not found for AssetId ${feeAssetId}`)

  const feeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAssetId),
  )

  if (!asset) throw new Error(`Asset not found for AssetId ${opportunity?.underlyingAssetId}`)

  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : null),
    [accountId],
  )

  const handleViewPosition = useCallback(() => {
    browserHistory.push('/earn')
  }, [browserHistory])

  const handleCancel = history.goBack

  const serializedTxIndex = useMemo(() => {
    if (!(state?.txid && accountId && accountAddress?.length)) return ''
    return serializeTxIndex(accountId, state.txid, accountAddress)
  }, [state?.txid, accountAddress, accountId])

  const confirmedTransaction = useAppSelector(gs => selectTxById(gs, serializedTxIndex))

  const { statusIcon, status, statusText, statusBg, statusBody } = useMemo(() => {
    if (maybeSafeTx?.isQueuedSafeTx)
      return {
        statusIcon: null,
        status: TxStatus.Pending,
        statusText: StatusTextEnum.pending,
        statusBody: translate('common.safeProposalQueued', {
          currentConfirmations: maybeSafeTx.transaction?.confirmations?.length,
          confirmationsRequired: maybeSafeTx.transaction?.confirmationsRequired,
        }),
        statusBg: 'transparent',
      }

    if (maybeSafeTx?.transaction?.transactionHash)
      return {
        statusText: StatusTextEnum.success,
        status: TxStatus.Confirmed,
        statusIcon: <CheckIcon color='gray.900' fontSize='xs' />,
        statusBody: translate('modals.withdraw.status.success', {
          opportunity: opportunity?.opportunityName,
        }),
        statusBg: 'green.500',
      }

    switch (confirmedTransaction?.status) {
      case TxStatus.Confirmed:
        return {
          statusText: StatusTextEnum.success,
          status: TxStatus.Confirmed,
          statusIcon: <CheckIcon color='gray.900' fontSize='xs' />,
          statusBody: translate('modals.withdraw.status.success', {
            opportunity: opportunity?.opportunityName,
          }),
          statusBg: 'green.500',
        }
      case TxStatus.Failed:
        return {
          statusText: StatusTextEnum.failed,
          status: TxStatus.Failed,
          statusIcon: <CloseIcon color='gray.900' fontSize='xs' />,
          statusBody: translate('modals.withdraw.status.failed'),
          statusBg: 'red.500',
        }
      default:
        return {
          statusIcon: null,
          status: TxStatus.Pending,
          statusText: StatusTextEnum.pending,
          statusBody: translate('modals.withdraw.status.pending'),
          statusBg: 'transparent',
        }
    }
  }, [
    maybeSafeTx?.isQueuedSafeTx,
    maybeSafeTx?.transaction?.confirmations?.length,
    maybeSafeTx?.transaction?.confirmationsRequired,
    maybeSafeTx?.transaction?.transactionHash,
    translate,
    opportunity?.opportunityName,
    confirmedTransaction?.status,
  ])

  useEffect(() => {
    if (status && status !== TxStatus.Pending && dispatch) {
      const usedGasFeeCryptoPrecision = (() => {
        if (maybeSafeTx?.transaction?.gasUsed)
          return fromBaseUnit(maybeSafeTx.transaction.gasUsed, feeAsset.precision)
        if (confirmedTransaction?.fee)
          return fromBaseUnit(confirmedTransaction.fee.value, feeAsset.precision)
        return '0'
      })()

      dispatch({
        type: FoxFarmingWithdrawActionType.SET_WITHDRAW,
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
    if (!opportunity) return
    if (!state) return

    if (status === TxStatus.Confirmed) {
      trackOpportunityEvent(
        MixPanelEvent.WithdrawSuccess,
        {
          opportunity,
          fiatAmounts: [state.withdraw.fiatAmount],
          cryptoAmounts: [{ assetId: asset.assetId, amountCryptoHuman: state.withdraw.lpAmount }],
        },
        assets,
      )
    }
  }, [
    asset.assetId,
    assets,
    opportunity,
    state,
    state?.withdraw.fiatAmount,
    state?.withdraw.lpAmount,
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

  if (!state || !dispatch || !opportunity) return null

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
      pairIcons={opportunity?.icons}
    >
      <Summary>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='modals.confirm.amountToWithdraw' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <PairIcons
                icons={opportunity?.icons!}
                iconBoxSize='5'
                h='38px'
                p={1}
                borderRadius={8}
              />
              <RawText>{asset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.lpAmount} symbol={asset.symbol} />
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
                    ? state.withdraw.estimatedGasCryptoPrecision
                    : state.withdraw.usedGasFeeCryptoPrecision,
                )
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(
                  status === TxStatus.Pending
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
