import { Alert, AlertIcon, Box, Stack, useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAssetId, osmosisAssetId } from '@shapeshiftoss/caip'
import type {
  CosmosSdkChainId,
  FeeData,
  GetFeeDataInput,
  osmosis,
} from '@shapeshiftoss/chain-adapters'
import { supportsOsmosis } from '@shapeshiftoss/hdwallet-core'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { Summary } from 'features/defi/components/Summary'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import {
  getPool,
  getPoolIdFromAssetReference,
} from 'state/slices/opportunitiesSlice/resolvers/osmosis/utils'
import { getUnderlyingAssetIdsBalances } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectAssets,
  selectBIP44ParamsByAccountId,
  selectMarketDataById,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectSelectedCurrencyMarketDataSortedByMarketCap,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { OsmosisWithdrawActionType } from '../LpWithdrawCommon'
import { WithdrawContext } from '../LpWithdrawContext'

const DEFAULT_SLIPPAGE = '0.025' // Allow for 2.5% slippage. TODO:(pastaghost) is there a better way to do this?

type ConfirmProps = { accountId: AccountId | undefined } & StepComponentProps

export const Confirm: React.FC<ConfirmProps> = ({ accountId, onNext }) => {
  const { state, dispatch: contextDispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId } = query
  const osmosisOpportunity = state?.opportunity

  const chainAdapter = getChainAdapterManager().get(chainId) as unknown as osmosis.ChainAdapter

  const assets = useAppSelector(selectAssets)
  const marketData = useAppSelector(selectSelectedCurrencyMarketDataSortedByMarketCap)

  const underlyingAssetBalances = useMemo(() => {
    if (!osmosisOpportunity || !state) return null
    return getUnderlyingAssetIdsBalances({
      assetId: osmosisOpportunity.assetId,
      underlyingAssetIds: osmosisOpportunity.underlyingAssetIds,
      underlyingAssetRatiosBaseUnit: osmosisOpportunity.underlyingAssetRatiosBaseUnit,
      cryptoAmountBaseUnit: state.withdraw.shareInAmountBaseUnit,
      assets,
      marketData,
    })
  }, [assets, marketData, osmosisOpportunity, state])

  const lpAsset: Asset | undefined = useAppSelector(state =>
    selectAssetById(state, osmosisOpportunity?.assetId ?? ''),
  )
  const feeAsset = useAppSelector(state => selectAssetById(state, osmosisAssetId))

  const underlyingAsset0 = useAppSelector(state =>
    selectAssetById(state, osmosisOpportunity?.underlyingAssetIds[0] || ''),
  )
  const underlyingAsset1 = useAppSelector(state =>
    selectAssetById(state, osmosisOpportunity?.underlyingAssetIds[1] || ''),
  )

  const feeMarketData = useAppSelector(state => selectMarketDataById(state, osmosisAssetId))

  const accountFilter = useMemo(() => ({ accountId }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  const { state: walletState } = useWallet()

  const toast = useToast()

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset?.assetId, accountId: accountId ?? '' }),
    [accountId, feeAsset?.assetId],
  )
  const feeAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, feeAssetBalanceFilter),
  )

  const handleWithdraw = useCallback(async () => {
    if (
      !(
        contextDispatch &&
        state &&
        state.withdraw.underlyingAsset0 &&
        state.withdraw.underlyingAsset1 &&
        walletState &&
        walletState.wallet &&
        supportsOsmosis(walletState.wallet) &&
        osmosisOpportunity &&
        chainAdapter &&
        bip44Params &&
        lpAsset &&
        underlyingAsset0 &&
        underlyingAsset1 &&
        underlyingAssetBalances
      )
    ) {
      return
    }
    try {
      const { assetReference: poolAssetReference } = fromAssetId(osmosisOpportunity.assetId)
      const id = getPoolIdFromAssetReference(poolAssetReference)
      if (!id) return

      const poolData = await getPool(id)
      if (!poolData) return

      contextDispatch({ type: OsmosisWithdrawActionType.SET_LOADING, payload: true })

      if (!(poolData && poolData.id && walletState && walletState.wallet)) return
      const getFeeDataInput: Partial<GetFeeDataInput<CosmosSdkChainId>> = { sendMax: false }
      const estimatedFees = await chainAdapter.getFeeData(getFeeDataInput)
      const result = await (async () => {
        const fees = estimatedFees.average as FeeData<CosmosSdkChainId>
        const {
          chainSpecific: { gasLimit },
          txFee,
        } = fees

        const { accountNumber } = bip44Params

        if (!(walletState && walletState.wallet)) return
        return await chainAdapter.buildLPRemoveTransaction({
          poolId: poolData.id,
          shareInAmount: state.withdraw.shareInAmountBaseUnit,
          tokenOutMins: [
            {
              amount: bnOrZero(state.withdraw.underlyingAsset0.amount)
                .multipliedBy(bn(1).minus(bnOrZero(DEFAULT_SLIPPAGE)))
                .toFixed(0, BigNumber.ROUND_DOWN),
              denom: state.withdraw.underlyingAsset0.denom,
            },
            {
              amount: bnOrZero(state.withdraw.underlyingAsset1.amount)
                .multipliedBy(bn(1).minus(bnOrZero(DEFAULT_SLIPPAGE)))
                .toFixed(0, BigNumber.ROUND_DOWN),
              denom: state.withdraw.underlyingAsset1.denom,
            },
          ],
          wallet: walletState?.wallet,
          accountNumber,
          chainSpecific: {
            gas: gasLimit,
            fee: txFee,
          },
        })
      })()
      const txToSign = result?.txToSign

      if (!txToSign) {
        throw new Error('Error generating unsigned transaction')
      }
      const txid = await (async () => {
        if (walletState.wallet?.supportsOfflineSigning()) {
          const signedTx = await chainAdapter.signTransaction({
            txToSign,
            wallet: walletState.wallet,
          })
          return chainAdapter.broadcastTransaction(signedTx)
        } else if (walletState.wallet?.supportsBroadcast()) {
          /**
           * signAndBroadcastTransaction is an optional method on the HDWallet interface.
           * Check and see if it exists; if so, call and make sure a txhash is returned
           */
          if (!chainAdapter.signAndBroadcastTransaction) {
            throw new Error('signAndBroadcastTransaction undefined for wallet')
          }
          return chainAdapter.signAndBroadcastTransaction?.({
            txToSign,
            wallet: walletState?.wallet,
          })
        } else {
          throw new Error('Bad hdwallet config')
        }
      })()

      if (!txid) {
        throw new Error('Broadcast failed')
      }

      contextDispatch({ type: OsmosisWithdrawActionType.SET_TXID, payload: txid })
      onNext(DefiStep.Status)
      trackOpportunityEvent(
        MixPanelEvents.WithdrawConfirm,
        {
          opportunity: osmosisOpportunity,
          fiatAmounts: [
            underlyingAssetBalances[underlyingAsset0.assetId].fiatAmount,
            underlyingAssetBalances[underlyingAsset1.assetId].fiatAmount,
          ],
          cryptoAmounts: [
            {
              assetId: underlyingAsset0.assetId,
              amountCryptoHuman:
                underlyingAssetBalances[underlyingAsset0.assetId].cryptoBalancePrecision,
            },
            {
              assetId: underlyingAsset1.assetId,
              amountCryptoHuman:
                underlyingAssetBalances[underlyingAsset1.assetId].cryptoBalancePrecision,
            },
          ],
        },
        assets,
      )
    } catch (error) {
      console.error(error)
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      contextDispatch({ type: OsmosisWithdrawActionType.SET_LOADING, payload: false })
    }
  }, [
    contextDispatch,
    state,
    walletState,
    osmosisOpportunity,
    chainAdapter,
    bip44Params,
    lpAsset,
    underlyingAsset0,
    underlyingAsset1,
    underlyingAssetBalances,
    onNext,
    assets,
    toast,
    translate,
  ])

  const handleCancel = useCallback(() => {
    onNext(DefiStep.Info)
  }, [onNext])

  const hasEnoughBalanceForGas = useMemo(
    () =>
      bnOrZero(feeAssetBalance)
        .minus(
          bnOrZero(state?.withdraw.estimatedFeeCryptoBaseUnit).div(
            bn(10).pow(feeAsset?.precision ?? '0'),
          ),
        )
        .gte(0),
    [feeAssetBalance, state?.withdraw, feeAsset?.precision],
  )

  useEffect(() => {
    if (!hasEnoughBalanceForGas && mixpanel) {
      mixpanel.track(MixPanelEvents.InsufficientFunds)
    }
  }, [hasEnoughBalanceForGas, mixpanel])

  if (!(state && contextDispatch && lpAsset && underlyingAsset0 && underlyingAsset1 && feeAsset))
    return null

  const underlyingAsset0AmountPrecision = bnOrZero(state.withdraw.underlyingAsset0.amount)
    .dividedBy(bn(10).pow(underlyingAsset0.precision ?? '0'))
    .toString()
  const underlyingAsset1AmountPrecision = bnOrZero(state.withdraw.underlyingAsset1.amount)
    .dividedBy(bn(10).pow(underlyingAsset1.precision ?? '0'))
    .toString()

  if (!(feeAsset && lpAsset && underlyingAsset0AmountPrecision && underlyingAsset1AmountPrecision))
    return null

  return (
    <ReusableConfirm
      onCancel={handleCancel}
      onConfirm={handleWithdraw}
      isDisabled={!hasEnoughBalanceForGas}
      loading={state.loading}
      loadingText={translate('common.confirm')}
      headerText='modals.confirm.withdraw.header'
    >
      <Summary>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='modals.confirm.amountToWithdraw' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={underlyingAsset0.icon} />
              <RawText>{underlyingAsset0.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto
                value={underlyingAsset0AmountPrecision}
                symbol={underlyingAsset0.symbol}
              />
            </Row.Value>
          </Row>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={underlyingAsset1.icon} />
              <RawText>{underlyingAsset1.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto
                value={underlyingAsset1AmountPrecision}
                symbol={underlyingAsset1.symbol}
              />
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
                value={bnOrZero(state.withdraw.estimatedFeeCryptoBaseUnit)
                  .times(feeMarketData.price)
                  .div(bn(10).pow(feeAsset.precision))
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(state?.withdraw.estimatedFeeCryptoBaseUnit)
                  .div(bn(10).pow(feeAsset?.precision ?? '0'))
                  .toFixed(5)}
                symbol={feeAsset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
      </Summary>
      {!hasEnoughBalanceForGas && (
        <Alert status='error' borderRadius='lg'>
          <AlertIcon />
          <Text translation={['modals.confirm.notEnoughGas', { assetSymbol: feeAsset.symbol }]} />
        </Alert>
      )}
    </ReusableConfirm>
  )
}
