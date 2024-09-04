import { CheckIcon, CloseIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Button, Link, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { PairIcons } from 'features/defi/components/PairIcons/PairIcons'
import { Summary } from 'features/defi/components/Summary'
import { TxStatus } from 'features/defi/components/TxStatus/TxStatus'
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

  useEffect(() => {
    if (confirmedTransaction && confirmedTransaction.status !== 'Pending' && dispatch) {
      dispatch({
        type: FoxFarmingDepositActionType.SET_DEPOSIT,
        payload: {
          txStatus: confirmedTransaction.status === 'Confirmed' ? 'success' : 'failed',
          usedGasFeeCryptoPrecision: confirmedTransaction.fee
            ? fromBaseUnit(confirmedTransaction.fee.value, feeAsset.precision)
            : '0',
        },
      })
    }
  }, [confirmedTransaction, dispatch, feeAsset.precision])

  useEffect(() => {
    if (!foxFarmingOpportunity) return
    if (state?.deposit.txStatus === 'success') {
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
    state?.deposit.cryptoAmount,
    state?.deposit.fiatAmount,
    state?.deposit.txStatus,
  ])

  if (!state || !dispatch || !foxFarmingOpportunity) return null

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
        statusBody: translate('modals.deposit.status.pending'),
        statusBg: 'transparent',
      }

    // Safe Success Tx
    if (maybeSafeTx?.transaction?.transactionHash)
      return {
        statusText: StatusTextEnum.success,
        statusIcon: <CheckIcon color='gray.900' fontSize='xs' />,
        statusBody: translate('modals.deposit.status.success', {
          opportunity: foxFarmingOpportunity?.opportunityName,
        }),
        statusBg: 'green.500',
      }

    switch (state.deposit.txStatus) {
      case 'success':
        return {
          statusText: StatusTextEnum.success,
          statusIcon: <CheckIcon color='gray.900' fontSize='xs' />,
          statusBody: translate('modals.deposit.status.success', {
            opportunity: foxFarmingOpportunity?.opportunityName,
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
      pairIcons={foxFarmingOpportunity?.icons}
    >
      <Summary>
        <Row variant='vertical' p={4}>
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
            href={`${asset.explorerTxLink}/${state.txid}`}
          >
            {translate('defi.viewOnChain')}
          </Button>
        </Row>
      </Summary>
    </TxStatus>
  )
}
