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
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import type { OsmosisSupportedChainId } from 'lib/swapper/swappers/OsmosisSwapper/utils/types'
import {
  getPool,
  getPoolIdFromAssetReference,
  OSMOSIS_PRECISION,
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

import { OsmosisDepositActionType } from '../LpDepositCommon'
import { DepositContext } from '../LpDepositContext'

type ConfirmProps = { accountId: AccountId | undefined } & StepComponentProps

export const Confirm: React.FC<ConfirmProps> = ({ onNext, accountId }) => {
  const { state, dispatch: contextDispatch } = useContext(DepositContext)
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
      cryptoAmountBaseUnit: state.deposit.shareOutAmountBaseUnit,
      assets,
      marketData,
    })
  }, [assets, marketData, osmosisOpportunity, state])

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
  const feeAssetBalance = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, feeAssetBalanceFilter),
  )

  const handleDeposit = async () => {
    if (
      !(
        contextDispatch &&
        state &&
        state.opportunity &&
        walletState &&
        walletState.wallet &&
        supportsOsmosis(walletState.wallet) &&
        osmosisOpportunity &&
        chainAdapter &&
        bip44Params &&
        underlyingAsset0 &&
        underlyingAsset1 &&
        underlyingAssetBalances
      )
    ) {
      return
    }
    try {
      contextDispatch({ type: OsmosisDepositActionType.SET_LOADING, payload: true })

      const getFeeDataInput: Partial<GetFeeDataInput<OsmosisSupportedChainId>> = { sendMax: false }
      const estimatedFees = await chainAdapter.getFeeData(getFeeDataInput)
      const result = await (async () => {
        const fees = estimatedFees.average as FeeData<CosmosSdkChainId>
        const {
          chainSpecific: { gasLimit },
          txFee,
        } = fees

        const { assetReference: poolAssetReference } = fromAssetId(osmosisOpportunity.assetId)
        const id = getPoolIdFromAssetReference(poolAssetReference)
        if (!id) return

        const poolData = await getPool(id)
        if (!poolData) return

        if (!poolData || !poolData.id || !walletState.wallet) return
        const { accountNumber } = bip44Params

        return await chainAdapter.buildLPAddTransaction({
          poolId: poolData.id,
          shareOutAmount: state.deposit.shareOutAmountBaseUnit,
          tokenInMaxs: [
            {
              amount: bnOrZero(state.deposit.underlyingAsset0.amount).toFixed(
                0,
                BigNumber.ROUND_DOWN,
              ),
              denom: state.deposit.underlyingAsset0.denom,
            },
            {
              amount: bnOrZero(state.deposit.underlyingAsset1.amount).toFixed(
                0,
                BigNumber.ROUND_DOWN,
              ),
              denom: state.deposit.underlyingAsset1.denom,
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
      contextDispatch({ type: OsmosisDepositActionType.SET_TXID, payload: txid })
      onNext(DefiStep.Status)
      trackOpportunityEvent(
        MixPanelEvents.DepositConfirm,
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
      contextDispatch({ type: OsmosisDepositActionType.SET_LOADING, payload: false })
    }
  }

  const handleCancel = useCallback(() => {
    onNext(DefiStep.Info)
  }, [onNext])

  const hasEnoughBalanceForGas = useMemo(
    () =>
      bnOrZero(feeAssetBalance)
        .minus(
          bnOrZero(state?.deposit.estimatedFeeCryptoBaseUnit).div(
            bn(10).pow(feeAsset?.precision ?? '0'),
          ),
        )
        .gte(0),
    [feeAssetBalance, state?.deposit, feeAsset?.precision],
  )

  useEffect(() => {
    if (!hasEnoughBalanceForGas && mixpanel) {
      mixpanel.track(MixPanelEvents.InsufficientFunds)
    }
  }, [hasEnoughBalanceForGas, mixpanel])

  if (!(state && contextDispatch && underlyingAsset0 && underlyingAsset1 && feeAsset)) return null

  const underlyingAsset0Amount = bnOrZero(state.deposit.underlyingAsset0.amount)
    .dividedBy(bn(10).pow(underlyingAsset0.precision))
    .toString()
  const underlyingAsset1Amount = bnOrZero(state.deposit.underlyingAsset1.amount)
    .dividedBy(bn(10).pow(underlyingAsset1.precision))
    .toString()

  const estimatedFeeCryptoPrecision = bnOrZero(state.deposit.estimatedFeeCryptoBaseUnit)
    .dividedBy(bn(10).pow(OSMOSIS_PRECISION))
    .toString()

  return (
    <ReusableConfirm
      onCancel={handleCancel}
      onConfirm={handleDeposit}
      isDisabled={!hasEnoughBalanceForGas}
      loading={state.loading}
      loadingText={translate('common.confirm')}
      headerText='modals.confirm.deposit.header'
    >
      <Summary>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='modals.confirm.amountToDeposit' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={underlyingAsset0.icon} />
              <RawText>{underlyingAsset0.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={underlyingAsset0Amount} symbol={underlyingAsset0.symbol} />
            </Row.Value>
          </Row>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={underlyingAsset1.icon} />
              <RawText>{underlyingAsset1.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={underlyingAsset1Amount} symbol={underlyingAsset1.symbol} />
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
                value={bnOrZero(estimatedFeeCryptoPrecision).times(feeMarketData.price).toFixed(2)}
              />
              <Amount.Crypto
                color='text.subtle'
                value={bnOrZero(estimatedFeeCryptoPrecision).toFixed(5)}
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
