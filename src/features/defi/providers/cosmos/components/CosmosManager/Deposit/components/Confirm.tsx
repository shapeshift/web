import { Alert, AlertDescription, AlertIcon, Box, Stack, useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { Summary } from 'features/defi/components/Summary'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { StakingAction } from 'plugins/cosmos/components/modals/Staking/StakingCommon'
import { useStakingAction } from 'plugins/cosmos/hooks/useStakingAction/useStakingAction'
import { getFormFees } from 'plugins/cosmos/utils'
import { useCallback, useContext, useEffect, useMemo } from 'react'
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

import { CosmosDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

type ConfirmProps = StepComponentProps & { accountId?: AccountId | undefined }

export const Confirm: React.FC<ConfirmProps> = ({ onNext, accountId }) => {
  const { state, dispatch } = useContext(DepositContext)
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress, assetReference } = query
  const assetNamespace = 'slip44'

  const validatorId = toValidatorId({ chainId, account: contractAddress })

  const opportunityMetadataFilter = useMemo(() => ({ validatorId }), [validatorId])

  const opportunityData = useAppSelector(state =>
    selectStakingOpportunityByFilter(state, opportunityMetadataFilter),
  )

  const assets = useAppSelector(selectAssets)
  const assetId = toAssetId({ chainId, assetNamespace, assetReference })
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: ASSET_REFERENCE.Cosmos,
  })

  const wallet = useWallet().state.wallet

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const assetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId))

  const cryptoAmount = useMemo(
    () => bnOrZero(state?.deposit.cryptoAmount).toString(),
    [state?.deposit.cryptoAmount],
  )
  const fiatAmount = useMemo(
    () => bnOrZero(cryptoAmount).times(assetMarketData.price).toString(),
    [assetMarketData.price, cryptoAmount],
  )

  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  // user info
  const { state: walletState } = useWallet()

  // notify
  const toast = useToast()

  const filter = useMemo(
    () => ({ assetId: feeAsset?.assetId ?? '', accountId: accountId ?? '' }),
    [feeAsset?.assetId, accountId],
  )
  const feeAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, filter),
  )

  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const { handleStakingAction } = useStakingAction()

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  const handleDeposit = useCallback(async () => {
    if (
      !(
        state?.deposit &&
        dispatch &&
        bip44Params &&
        assetReference &&
        walletState.wallet &&
        opportunityData
      )
    )
      return
    dispatch({ type: CosmosDepositActionType.SET_LOADING, payload: true })

    const { gasLimit, gasPrice } = await getFormFees(asset, marketData.price)

    try {
      const broadcastTxId = await handleStakingAction({
        asset,
        bip44Params,
        validator: contractAddress,
        chainSpecific: {
          gas: gasLimit,
          fee: bnOrZero(gasPrice).times(`1e+${asset?.precision}`).toString(),
        },
        value: bnOrZero(state.deposit.cryptoAmount).times(`1e+${asset.precision}`).toFixed(0),
        action: StakingAction.Stake,
      })

      dispatch({
        type: CosmosDepositActionType.SET_DEPOSIT,
        payload: {
          txStatus: broadcastTxId?.length ? 'success' : 'failed',
        },
      })

      if (!broadcastTxId) {
        throw new Error() // TODO:
      }

      dispatch({ type: CosmosDepositActionType.SET_TXID, payload: broadcastTxId })
    } catch (error) {
      console.error(error)
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      onNext(DefiStep.Status)
      dispatch({ type: CosmosDepositActionType.SET_LOADING, payload: false })
      trackOpportunityEvent(
        MixPanelEvents.DepositConfirm,
        {
          opportunity: opportunityData,
          fiatAmounts: [fiatAmount],
          cryptoAmounts: [{ assetId, amountCryptoHuman: cryptoAmount }],
        },
        assets,
      )
    }
  }, [
    asset,
    assetId,
    assetReference,
    assets,
    bip44Params,
    contractAddress,
    cryptoAmount,
    dispatch,
    fiatAmount,
    handleStakingAction,
    marketData.price,
    onNext,
    opportunityData,
    state?.deposit,
    toast,
    translate,
    walletState.wallet,
  ])

  const hasEnoughBalanceForGas = bnOrZero(feeAssetBalance).gte(
    bnOrZero(state?.deposit.cryptoAmount).plus(
      bnOrZero(state?.deposit.estimatedGasCrypto).div(`1e+${feeAsset.precision}`),
    ),
  )
  useEffect(() => {
    if (!hasEnoughBalanceForGas) {
      getMixPanel()?.track(MixPanelEvents.InsufficientFunds)
    }
  })

  if (!state || !dispatch) return null

  return (
    <ReusableConfirm
      onCancel={() => onNext(DefiStep.Info)}
      onConfirm={handleDeposit}
      loading={state.loading}
      loadingText={translate('common.confirm')}
      isDisabled={!hasEnoughBalanceForGas}
      headerText='modals.confirm.deposit.header'
    >
      <Summary>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='modals.confirm.amountToStake' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={asset.icon} />
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
                value={bnOrZero(state.deposit.estimatedGasCrypto)
                  .div(`1e+${feeAsset.precision}`)
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(state.deposit.estimatedGasCrypto)
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
