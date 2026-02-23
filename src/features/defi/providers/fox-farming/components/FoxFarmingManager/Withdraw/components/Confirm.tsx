import { Alert, AlertIcon, Box, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { FoxFarmingWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

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
import { serializeUserStakingId, toOpportunityId } from '@/state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

type ConfirmProps = { accountId: AccountId | undefined } & StepComponentProps

export const Confirm: React.FC<ConfirmProps> = ({ accountId, onNext }) => {
  'use no memo'
  const { state, dispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const navigate = useNavigate()
  const mixpanel = getMixPanel()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { assetNamespace, chainId, contractAddress, rewardId } = query
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
  const toast = useNotificationToast({
    duration: isDrawerOpen ? 5000 : null,
  })

  const appDispatch = useAppDispatch()

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

  assertIsFoxEthStakingContractAddress(contractAddress)

  const { unstake } = useFoxFarming(contractAddress)
  const { onOngoingFarmingTxIdChange } = useFoxEth()
  // Asset info
  const underlyingAsset = useAppSelector(state =>
    selectAssetById(state, opportunity?.underlyingAssetId ?? ''),
  )

  const feeAssetId = getChainAdapterManager().get(chainId)?.getFeeAssetId()
  if (!feeAssetId) throw new Error(`Fee AssetId not found for ChainId ${chainId}`)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  const feeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAssetId),
  )

  // user info
  const { state: walletState } = useWallet()

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
        .minus(bnOrZero(state?.withdraw.estimatedGasCryptoPrecision))
        .gte(0),
    [feeAssetBalance, state?.withdraw.estimatedGasCryptoPrecision],
  )

  const handleConfirm = useCallback(async () => {
    try {
      if (
        !dispatch ||
        !rewardId ||
        !walletState.wallet ||
        state?.loading ||
        !state?.withdraw ||
        !opportunity ||
        !underlyingAsset ||
        !accountId
      )
        return
      dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: true })
      const txid = await unstake(state.withdraw.lpAmount, state.withdraw.isExiting)
      if (!txid) throw new Error(`Transaction failed`)
      dispatch({ type: FoxFarmingWithdrawActionType.SET_TXID, payload: txid })
      onOngoingFarmingTxIdChange(txid, contractAddress)

      const now = Date.now()
      appDispatch(
        actionSlice.actions.upsertAction({
          id: txid,
          createdAt: now,
          updatedAt: now,
          type: ActionType.Withdraw,
          status: ActionStatus.Pending,
          transactionMetadata: {
            displayType: GenericTransactionDisplayType.FoxFarm,
            message: 'actionCenter.withdrawal.pending',
            amountCryptoPrecision: bnOrZero(state.withdraw.lpAmount).decimalPlaces(6).toString(),
            assetId: underlyingAsset.assetId,
            chainId: underlyingAsset.chainId,
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

      dispatch({ type: FoxFarmingWithdrawActionType.SET_LOADING, payload: false })

      trackOpportunityEvent(
        MixPanelEvent.WithdrawConfirm,
        {
          opportunity,
          fiatAmounts: [state.withdraw.fiatAmount],
          cryptoAmounts: [
            { assetId: underlyingAsset.assetId, amountCryptoHuman: state.withdraw.lpAmount },
          ],
        },
        assets,
      )

      navigate(-1)
    } catch (error) {
      console.error(error)
    }
  }, [
    accountId,
    appDispatch,
    assets,
    contractAddress,
    dispatch,
    isDrawerOpen,
    navigate,
    onOngoingFarmingTxIdChange,
    openActionCenter,
    opportunity,
    rewardId,
    state?.loading,
    state?.withdraw,
    toast,
    underlyingAsset,
    unstake,
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

  if (!state || !dispatch || !underlyingAsset || !opportunity) return null

  return (
    <ReusableConfirm
      onCancel={handleCancel}
      headerText='modals.confirm.withdraw.header'
      onConfirm={handleConfirm}
      isDisabled={!hasEnoughBalanceForGas}
      loading={state.loading}
      loadingText={translate('common.confirm')}
    >
      <Summary>
        <Row variant='vert-gutter' p={4}>
          <Row.Label>
            <Text translation='modals.confirm.amountToWithdraw' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <PairIcons
                icons={opportunity?.icons}
                iconBoxSize='5'
                h='38px'
                p={1}
                borderRadius={8}
              />
              <RawText>{underlyingAsset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.lpAmount} symbol={underlyingAsset.symbol} />
            </Row.Value>
          </Row>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <Text translation='modals.confirm.estimatedGas' />
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(state.withdraw.estimatedGasCryptoPrecision)
                  .times(bnOrZero(feeMarketData?.price))
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(state.withdraw.estimatedGasCryptoPrecision).toFixed(5)}
                symbol={feeAsset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
      </Summary>
      {!hasEnoughBalanceForGas && (
        <Alert status='error' borderRadius='lg'>
          <AlertIcon />
          <Text translation={notEnoughGasTranslation} />
        </Alert>
      )}
    </ReusableConfirm>
  )
}
