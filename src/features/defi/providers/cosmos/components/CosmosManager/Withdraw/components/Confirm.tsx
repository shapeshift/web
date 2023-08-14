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
import { getFormFees } from 'plugins/cosmos/utils'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { walletCanEditMemo } from 'lib/utils'
import { toValidatorId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectBIP44ParamsByAccountId,
  selectMarketDataById,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectStakingOpportunityByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { CosmosWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

type ConfirmProps = StepComponentProps & { accountId: AccountId | undefined }

export const Confirm: React.FC<ConfirmProps> = ({ onNext, accountId }) => {
  const [gasLimit, setGasLimit] = useState<string | null>(null)
  const [gasPrice, setGasPrice] = useState<string | null>(null)
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
  const assetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  const fiatAmount = useMemo(
    () => bnOrZero(state?.withdraw.cryptoAmount).times(assetMarketData.price).toString(),
    [assetMarketData.price, state?.withdraw.cryptoAmount],
  )

  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  // user info
  const { state: walletState } = useWallet()

  const { handleStakingAction } = useStakingAction()

  useEffect(() => {
    ;(async () => {
      const { gasLimit, gasPrice } = await getFormFees(asset, feeMarketData.price)

      setGasLimit(gasLimit)
      setGasPrice(gasPrice)
    })()
  }, [asset, asset.precision, feeMarketData.price])

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset?.assetId, accountId: accountId ?? '' }),
    [accountId, feeAsset?.assetId],
  )
  const feeAssetBalance = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, feeAssetBalanceFilter),
  )

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  const handleConfirm = useCallback(async () => {
    if (
      state?.loading ||
      !(
        bip44Params &&
        dispatch &&
        gasLimit &&
        gasPrice &&
        state?.withdraw &&
        walletState?.wallet &&
        opportunityMetadata
      )
    )
      return

    try {
      dispatch({ type: CosmosWithdrawActionType.SET_LOADING, payload: true })

      const broadcastTxId = await handleStakingAction({
        asset,
        bip44Params,
        validator: contractAddress,
        chainSpecific: {
          gas: gasLimit,
          fee: bnOrZero(gasPrice).times(`1e+${asset?.precision}`).toString(),
        },
        value: bnOrZero(state.withdraw.cryptoAmount).times(`1e+${asset.precision}`).toFixed(0),
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
        MixPanelEvents.WithdrawConfirm,
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
    gasLimit,
    gasPrice,
    handleStakingAction,
    onNext,
    opportunityMetadata,
    state?.loading,
    state?.withdraw,
    walletState?.wallet,
  ])
  const hasEnoughBalanceForGas = bnOrZero(feeAssetBalance)
    .minus(bnOrZero(state?.withdraw.estimatedGasCrypto).div(`1e+${feeAsset.precision}`))
    .gte(0)

  useEffect(() => {
    if (!hasEnoughBalanceForGas) {
      getMixPanel()?.track(MixPanelEvents.InsufficientFunds)
    }
  }, [hasEnoughBalanceForGas])

  if (!state || !dispatch) return null

  return (
    <ReusableConfirm
      onCancel={() => onNext(DefiStep.Info)}
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
            <Text translation={['modals.confirm.xDays', { unbondingDays }]} />
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
                value={bnOrZero(state.withdraw.estimatedGasCrypto)
                  .div(`1e+${feeAsset.precision}`)
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(state.withdraw.estimatedGasCrypto)
                  .div(`1e+${feeAsset.precision}`)
                  .toFixed(5)}
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
            iconProps={{ color: 'currentColor' }}
          />
        </Alert>
      )}

      {!hasEnoughBalanceForGas && (
        <Alert status='error' borderRadius='lg'>
          <AlertIcon />
          <Text translation={['modals.confirm.notEnoughGas', { assetSymbol: feeAsset.symbol }]} />
        </Alert>
      )}
    </ReusableConfirm>
  )
}
