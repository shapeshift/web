import { Alert, AlertIcon, Box, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { FoxFarmingDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

import { Amount } from '@/components/Amount/Amount'
import type { StepComponentProps } from '@/components/DeFi/components/Steps'
import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import { Row } from '@/components/Row/Row'
import { RawText, Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { useFoxEth } from '@/context/FoxEthProvider/FoxEthProvider'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { Confirm as ReusableConfirm } from '@/features/defi/components/Confirm/Confirm'
import { PairIcons } from '@/features/defi/components/PairIcons/PairIcons'
import { Summary } from '@/features/defi/components/Summary'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useFoxFarming } from '@/features/defi/providers/fox-farming/hooks/useFoxFarming'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { trackOpportunityEvent } from '@/lib/mixpanel/helpers'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
import { assertIsFoxEthStakingContractAddress } from '@/state/slices/opportunitiesSlice/constants'
import { toOpportunityId } from '@/state/slices/opportunitiesSlice/utils'
import {
  selectAggregatedEarnUserStakingOpportunityByStakingId,
  selectAssetById,
  selectAssets,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const Confirm: React.FC<StepComponentProps & { accountId: AccountId | undefined }> = ({
  accountId,
  onNext,
}) => {
  'use no memo'
  const { state, dispatch } = useContext(DepositContext)
  const translate = useTranslate()
  const navigate = useNavigate()
  const mixpanel = getMixPanel()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { assetNamespace, chainId, contractAddress, assetReference } = query
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()

  const appDispatch = useAppDispatch()

  assertIsFoxEthStakingContractAddress(contractAddress)

  const { stake } = useFoxFarming(contractAddress)

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

  const { onOngoingFarmingTxIdChange } = useFoxEth()

  const assets = useAppSelector(selectAssets)

  const asset = useAppSelector(state =>
    selectAssetById(state, foxFarmingOpportunity?.underlyingAssetId ?? ''),
  )

  const feeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAssetId),
  )

  // user info
  const { state: walletState } = useWallet()
  const accountAddress = useMemo(
    () => (accountId ? fromAccountId(accountId).account : null),
    [accountId],
  )

  // notify
  const toast = useNotificationToast({ desktopPosition: 'top-right' })

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset?.assetId, accountId: accountId ?? '' }),
    [accountId, feeAsset?.assetId],
  )
  const feeAssetBalance = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, feeAssetBalanceFilter),
  )

  const hasEnoughBalanceForGas = useMemo(
    () =>
      bnOrZero(feeAssetBalance)
        .minus(bnOrZero(state?.deposit.estimatedGasCryptoPrecision))
        .gte(0),
    [feeAssetBalance, state?.deposit.estimatedGasCryptoPrecision],
  )

  const handleDeposit = useCallback(async () => {
    if (
      !dispatch ||
      !state ||
      !accountAddress ||
      !assetReference ||
      !walletState.wallet ||
      !asset ||
      !foxFarmingOpportunity ||
      !accountId
    )
      return
    try {
      dispatch({ type: FoxFarmingDepositActionType.SET_LOADING, payload: true })
      const txid = await stake(state.deposit.cryptoAmount)
      if (!txid) throw new Error('Transaction failed')
      dispatch({ type: FoxFarmingDepositActionType.SET_TXID, payload: txid })
      onOngoingFarmingTxIdChange(txid, contractAddress)

      const now = Date.now()
      appDispatch(
        actionSlice.actions.upsertAction({
          id: txid,
          createdAt: now,
          updatedAt: now,
          type: ActionType.Deposit,
          status: ActionStatus.Pending,
          transactionMetadata: {
            displayType: GenericTransactionDisplayType.FoxFarm,
            message: 'actionCenter.deposit.pending',
            amountCryptoPrecision: bnOrZero(state.deposit.cryptoAmount).decimalPlaces(6).toString(),
            assetId: asset.assetId,
            chainId: asset.chainId,
            accountId,
            txHash: txid,
          },
        }),
      )

      toast({
        id: txid,
        duration: isDrawerOpen ? 5000 : null,
        status: 'success',
        position: 'bottom-right',
        render: ({ onClose, ...props }) => {
          const handleClick = () => {
            onClose()
            openActionCenter()
          }

          return (
            <GenericTransactionNotification
              handleClick={handleClick}
              actionId={txid}
              onClose={onClose}
              {...props}
            />
          )
        },
      })

      trackOpportunityEvent(
        MixPanelEvent.DepositConfirm,
        {
          opportunity: foxFarmingOpportunity,
          fiatAmounts: [state.deposit.fiatAmount],
          cryptoAmounts: [
            {
              assetId: asset.assetId,
              amountCryptoHuman: state.deposit.cryptoAmount,
            },
          ],
        },
        assets,
      )

      navigate(-1)
    } catch (error) {
      console.error(error)
      toast({
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      dispatch({ type: FoxFarmingDepositActionType.SET_LOADING, payload: false })
    }
  }, [
    accountAddress,
    accountId,
    appDispatch,
    asset,
    assetReference,
    assets,
    contractAddress,
    dispatch,
    foxFarmingOpportunity,
    isDrawerOpen,
    navigate,
    onOngoingFarmingTxIdChange,
    openActionCenter,
    stake,
    state,
    toast,
    translate,
    walletState.wallet,
  ])

  useEffect(() => {
    if (!hasEnoughBalanceForGas) {
      mixpanel?.track(MixPanelEvent.InsufficientFunds)
    }
  }, [hasEnoughBalanceForGas, mixpanel])

  const handleCancel = useCallback(() => onNext(DefiStep.Info), [onNext])
  const notEnoughGasTranslation: TextPropTypes['translation'] = useMemo(
    () => ['modals.confirm.notEnoughGas', { assetSymbol: feeAsset.symbol }],
    [feeAsset.symbol],
  )

  if (!state || !dispatch || !foxFarmingOpportunity || !asset) return null

  return (
    <ReusableConfirm
      onCancel={handleCancel}
      onConfirm={handleDeposit}
      loading={state.loading}
      loadingText={translate('common.confirm')}
      isDisabled={!hasEnoughBalanceForGas}
      headerText='modals.confirm.deposit.header'
    >
      <Summary>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='modals.confirm.amountToDeposit' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <PairIcons
                icons={foxFarmingOpportunity?.icons}
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
        <Row p={4}>
          <Row.Label>
            <Text translation='modals.confirm.estimatedGas' />
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(state.deposit.estimatedGasCryptoPrecision)
                  .times(bnOrZero(feeMarketData?.price))
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(state.deposit.estimatedGasCryptoPrecision).toFixed(5)}
                symbol={feeAsset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
      </Summary>
      <Alert status='info' borderRadius='lg'>
        <AlertIcon />
        <Text translation='modals.confirm.deposit.preFooter' />
      </Alert>
      {!hasEnoughBalanceForGas && (
        <Alert status='error' borderRadius='lg'>
          <AlertIcon />
          <Text translation={notEnoughGasTranslation} />
        </Alert>
      )}
    </ReusableConfirm>
  )
}
