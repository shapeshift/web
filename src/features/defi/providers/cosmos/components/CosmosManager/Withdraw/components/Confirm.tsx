import { Alert, AlertDescription, AlertIcon, Box, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { Summary } from 'features/defi/components/Summary'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import {
  assetIdToUnbondingDays,
  StakingAction,
} from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import { useStakingAction } from 'plugins/cosmos/hooks/useStakingAction/useStakingAction'
import { getFeeData } from 'plugins/cosmos/utils'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { walletCanEditMemo } from 'lib/utils'
import { toValidatorId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectBip44ParamsByAccountId,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectStakingOpportunityByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { CosmosWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

type ConfirmProps = StepComponentProps & { accountId: AccountId | undefined }

const helperTooltipIconProps = { color: 'currentColor' }

export const Confirm: React.FC<ConfirmProps> = ({ onNext, accountId }) => {
  const { state, dispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query
  const wallet = useWallet().state.wallet

  const assetNamespace = 'slip44' // TODO: add to query, why do we hardcode this?
  const validatorId = toValidatorId({ chainId, account: contractAddress })

  const opportunityMetadataFilter = useMemo(() => ({ validatorId }), [validatorId])

  const opportunityMetadata = useAppSelector(state =>
    selectStakingOpportunityByFilter(state, opportunityMetadataFilter),
  )
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
    assetReference,
  })

  const unbondingDays = useMemo(() => assetIdToUnbondingDays(assetId), [assetId])
  const assets = useAppSelector(selectAssets)
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const assetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId),
  )
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAssetId),
  )

  const fiatAmount = useMemo(
    () =>
      bnOrZero(state?.withdraw.cryptoAmount)
        .times(assetMarketData.price)
        .toString(),
    [assetMarketData.price, state?.withdraw.cryptoAmount],
  )

  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  // user info
  const { state: walletState } = useWallet()

  const { handleStakingAction } = useStakingAction()

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset?.assetId, accountId: accountId ?? '' }),
    [accountId, feeAsset?.assetId],
  )
  const feeAssetBalance = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, feeAssetBalanceFilter),
  )

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBip44ParamsByAccountId(state, accountFilter))

  const handleConfirm = useCallback(async () => {
    if (
      state?.loading ||
      !(bip44Params && dispatch && state?.withdraw && walletState?.wallet && opportunityMetadata)
    )
      return

    try {
      dispatch({ type: CosmosWithdrawActionType.SET_LOADING, payload: true })

      const { gasLimit, txFee } = await getFeeData(asset)

      const broadcastTxId = await handleStakingAction({
        asset,
        bip44Params,
        validator: contractAddress,
        chainSpecific: {
          gas: gasLimit,
          fee: txFee,
        },
        value: toBaseUnit(state.withdraw.cryptoAmount, asset.precision),
        action: StakingAction.Unstake,
      })

      dispatch({
        type: CosmosWithdrawActionType.SET_WITHDRAW,
        payload: {
          txStatus: broadcastTxId?.length ? 'success' : 'failed',
        },
      })

      if (!broadcastTxId) {
        throw new Error() // TODO
      }

      dispatch({ type: CosmosWithdrawActionType.SET_TXID, payload: broadcastTxId })
    } catch (error) {
      console.error(error)
    } finally {
      dispatch({ type: CosmosWithdrawActionType.SET_LOADING, payload: false })
      onNext(DefiStep.Status)
      trackOpportunityEvent(
        MixPanelEvent.WithdrawConfirm,
        {
          opportunity: opportunityMetadata,
          fiatAmounts: [fiatAmount],
          cryptoAmounts: [{ assetId, amountCryptoHuman: state.withdraw.cryptoAmount }],
        },
        assets,
      )
    }
  }, [
    asset,
    assetId,
    assets,
    bip44Params,
    contractAddress,
    dispatch,
    fiatAmount,
    handleStakingAction,
    onNext,
    opportunityMetadata,
    state?.loading,
    state?.withdraw,
    walletState?.wallet,
  ])

  const estimatedGasCryptoPrecision = useMemo(() => {
    return bnOrZero(
      fromBaseUnit(state?.withdraw.estimatedGasCryptoBaseUnit ?? 0, feeAsset.precision),
    )
  }, [state?.withdraw.estimatedGasCryptoBaseUnit, feeAsset])

  const hasEnoughBalanceForGas = useMemo(() => {
    return bnOrZero(feeAssetBalance).gte(bnOrZero(estimatedGasCryptoPrecision))
  }, [estimatedGasCryptoPrecision, feeAssetBalance])

  useEffect(() => {
    if (!hasEnoughBalanceForGas) {
      getMixPanel()?.track(MixPanelEvent.InsufficientFunds)
    }
  }, [hasEnoughBalanceForGas])

  const handleCancel = useCallback(() => onNext(DefiStep.Info), [onNext])
  const xDaysTranslation: TextPropTypes['translation'] = useMemo(
    () => ['modals.confirm.xDays', { unbondingDays }],
    [unbondingDays],
  )

  const notEnoughGasTranslation: TextPropTypes['translation'] = useMemo(
    () => ['modals.confirm.notEnoughGas', { assetSymbol: feeAsset.symbol }],
    [feeAsset.symbol],
  )

  if (!state || !dispatch) return null

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
              <AssetIcon size='xs' src={underlyingAsset?.icon} />
              <RawText>{underlyingAsset?.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto
                value={state.withdraw.cryptoAmount}
                symbol={underlyingAsset?.symbol ?? ''}
              />
            </Row.Value>
          </Row>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <Text translation='modals.confirm.withdrawTime' />
          </Row.Label>
          <Row.Value fontWeight='bold'>
            <Text translation={xDaysTranslation} />
          </Row.Value>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <Text translation='modals.confirm.estimatedGas' />
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={estimatedGasCryptoPrecision.times(feeMarketData.price).toFixed()}
              />
              <Amount.Crypto
                color='text.subtle'
                value={estimatedGasCryptoPrecision.toFixed()}
                symbol={feeAsset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
      </Summary>
      {wallet && walletCanEditMemo(wallet) && (
        <Alert status='info' size='sm' gap={2}>
          <AlertDescription>{translate('defi.memoNote.title')}</AlertDescription>
          <HelperTooltip
            label={translate('defi.memoNote.body')}
            iconProps={helperTooltipIconProps}
          />
        </Alert>
      )}

      {!hasEnoughBalanceForGas && (
        <Alert status='error' borderRadius='lg'>
          <AlertIcon />
          <Text translation={notEnoughGasTranslation} />
        </Alert>
      )}
    </ReusableConfirm>
  )
}
