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
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { isSome } from 'lib/utils'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectFirstAccountIdByChainId,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
  selectSelectedCurrencyMarketDataSortedByMarketCap,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import { IdleClaimActionType } from '../ClaimCommon'
import { ClaimContext } from '../ClaimContext'
import type { ClaimAmount } from '../types'
import { ClaimableAsset } from './ClaimableAsset'

export const Status = () => {
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const { state, dispatch } = useContext(ClaimContext)
  const { query, history: browserHistory } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query

  const assets = useAppSelector(selectAssets)

  const assetNamespace = 'erc20'
  // Asset info
  const underlyingAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const underlyingAsset = useAppSelector(state => selectAssetById(state, underlyingAssetId))
  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference: contractAddress,
  })
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Ethereum,
  })
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  if (!underlyingAsset) throw new Error(`Asset not found for AssetId ${underlyingAssetId}`)
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))
  const marketData = useAppSelector(state =>
    selectSelectedCurrencyMarketDataSortedByMarketCap(state),
  )

  const accountId = useAppSelector(state => selectFirstAccountIdByChainId(state, chainId))

  const serializedTxIndex = useMemo(() => {
    if (!(state?.txid && accountId)) return ''
    return serializeTxIndex(accountId, state.txid, fromAccountId(accountId).account)
  }, [state.txid, accountId])
  const confirmedTransaction = useAppSelector(gs => selectTxById(gs, serializedTxIndex))

  useEffect(() => {
    if (confirmedTransaction && confirmedTransaction.status !== 'Pending' && dispatch) {
      dispatch({
        type: IdleClaimActionType.SET_CLAIM,
        payload: {
          txStatus: confirmedTransaction.status === 'Confirmed' ? 'success' : 'failed',
          usedGasFee: confirmedTransaction.fee?.value,
        },
      })
    }
  }, [confirmedTransaction, dispatch])

  const opportunityId = useMemo(
    () => toOpportunityId({ chainId, assetNamespace: 'erc20', assetReference: contractAddress }),
    [chainId, contractAddress],
  )
  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId }),
    [opportunityId],
  )
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )
  const opportunityDataFilter = useMemo(
    () => ({
      userStakingId: serializeUserStakingId(
        (accountId ?? highestBalanceAccountId)!,
        toOpportunityId({
          chainId,
          assetNamespace: 'erc20',
          assetReference: contractAddress,
        }),
      ),
    }),
    [accountId, chainId, contractAddress, highestBalanceAccountId],
  )

  const opportunityData = useAppSelector(state =>
    selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  const claimAmounts: ClaimAmount[] = useMemo(() => {
    if (!opportunityData?.rewardsCryptoBaseUnit?.amounts.length) return []

    return opportunityData.rewardsCryptoBaseUnit.amounts
      .map((amount, i) => {
        if (!opportunityData?.rewardAssetIds?.[i]) return undefined
        const amountCryptoHuman = bnOrZero(amount)
          .div(bn(10).pow(assets[opportunityData.rewardAssetIds[i]]?.precision ?? 1))
          .toNumber()
        const fiatAmount = bnOrZero(amountCryptoHuman)
          .times(bnOrZero(marketData[opportunityData.rewardAssetIds[i]]?.price))
          .toNumber()
        const token = {
          assetId: opportunityData.rewardAssetIds[i],
          amountCryptoHuman,
          fiatAmount,
        }
        return token
      })
      .filter(isSome)
  }, [assets, marketData, opportunityData?.rewardAssetIds, opportunityData?.rewardsCryptoBaseUnit])

  const claimableAssets = useMemo(() => {
    return claimAmounts.map(rewardAsset => {
      if (!rewardAsset?.assetId) return null
      const token = {
        assetId: rewardAsset.assetId,
        amount: rewardAsset.amountCryptoHuman,
      }
      return <ClaimableAsset key={rewardAsset?.assetId} token={token} />
    })
  }, [claimAmounts])

  const handleViewPosition = useCallback(() => {
    browserHistory.push('/earn')
  }, [browserHistory])

  const handleCancel = useCallback(() => {
    browserHistory.goBack()
  }, [browserHistory])

  useEffect(() => {
    if (!opportunityData) return
    if (state.claim.txStatus === 'success') {
      trackOpportunityEvent(
        MixPanelEvents.ClaimSuccess,
        {
          opportunity: opportunityData,
          fiatAmounts: claimAmounts.map(claimAmount => claimAmount.fiatAmount),
          cryptoAmounts: claimAmounts,
        },
        assets,
      )
    }
  }, [assets, claimAmounts, mixpanel, opportunityData, state.claim.txStatus])

  if (!state) return null

  const { statusIcon, statusText, statusBg, statusBody } = (() => {
    switch (state.claim.txStatus) {
      case 'success':
        return {
          statusText: StatusTextEnum.success,
          statusIcon: <CheckIcon color='white' />,
          statusBg: 'green.500',
          statusBody: translate('modals.withdraw.status.success', {
            opportunity: `${underlyingAsset.symbol} Vault`,
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
          statusIcon: <AssetIcon size='xs' src={asset?.icon} />,
          statusText: StatusTextEnum.pending,
          statusBg: 'transparent',
          statusBody: translate('modals.withdraw.status.pending'),
        }
    }
  })()

  return (
    <TxStatus
      onClose={handleCancel}
      onContinue={state.claim.txStatus === 'success' ? handleViewPosition : undefined}
      loading={!['success', 'failed'].includes(state.claim.txStatus)}
      continueText='modals.status.position'
      statusText={statusText}
      statusIcon={statusIcon}
      statusBg={statusBg}
      statusBody={statusBody}
    >
      <Summary spacing={0} mx={6} mb={4}>
        <Row variant='vert-gutter'>
          <Row.Label>
            <Text translation='modals.confirm.amountToClaim' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack
              width='100%'
              direction='column'
              alignItems='flex-start'
              justifyContent='center'
              as='form'
            >
              {claimableAssets}
            </Stack>
          </Row>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <Text
              translation={
                state.claim.txStatus === 'pending'
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
                  state.claim.txStatus === 'pending'
                    ? state.claim.estimatedGasCrypto
                    : state.claim.usedGasFee,
                )
                  .div(`1e+${feeAsset.precision}`)
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(
                  state.claim.txStatus === 'pending'
                    ? state.claim.estimatedGasCrypto
                    : state.claim.usedGasFee,
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
