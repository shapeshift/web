import { Alert, AlertIcon, Box, Stack, useToast } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, osmosisAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { CosmosSdkChainId, FeeData, osmosis } from '@shapeshiftoss/chain-adapters'
import { supportsOsmosis } from '@shapeshiftoss/hdwallet-core'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { Summary } from 'features/defi/components/Summary'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useCallback, useContext, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { StepComponentProps } from 'components/DeFi/components/Steps'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import { toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectBIP44ParamsByAccountId,
  selectEarnUserLpOpportunity,
  selectMarketDataById,
  selectPortfolioCryptoHumanBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { OsmosisWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

const moduleLogger = logger.child({
  namespace: ['DeFi', 'Providers', 'Foxy', 'Withdraw', 'Confirm'],
})

type ConfirmProps = { accountId: AccountId | undefined } & StepComponentProps

export const Confirm: React.FC<ConfirmProps> = ({ onNext, accountId }) => {
  const { state, dispatch: contextDispatch } = useContext(WithdrawContext)
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  // const opportunity = useMemo(() => state?.opportunity, [state])

  const assetId = toAssetId({ chainId, assetNamespace, assetReference })
  const opportunityId: LpId | undefined = useMemo(
    () => (assetId ? toOpportunityId({ chainId, assetNamespace, assetReference }) : undefined),
    [assetId, assetNamespace, assetReference, chainId],
  )

  const OsmosisLpOpportunityFilter = useMemo(
    () => ({
      lpId: opportunityId,
      assetId,
      accountId,
    }),
    [accountId, assetId, opportunityId],
  )
  const opportunity = useAppSelector(state =>
    selectEarnUserLpOpportunity(state, OsmosisLpOpportunityFilter),
  )

  const chainAdapter = getChainAdapterManager().get(chainId) as unknown as osmosis.ChainAdapter // TODO:(pastaghost) Ew.

  const asset: Asset | undefined = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const feeAsset = useAppSelector(state => selectAssetById(state, osmosisAssetId))

  // const rawOpportunityData = useAppSelector(state => selectLpOppo)

  const underlyingAsset0 = useAppSelector(state =>
    selectAssetById(state, opportunity?.underlyingAssetIds[0] || ''),
  )
  const underlyingAsset1 = useAppSelector(state =>
    selectAssetById(state, opportunity?.underlyingAssetIds[1] || ''),
  )
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${osmosisAssetId}`)
  if (!underlyingAsset0)
    throw new Error(`Asset not found for AssetId ${opportunity?.underlyingAssetIds[0]}`)
  if (!underlyingAsset1)
    throw new Error(`Asset not found for AssetId ${opportunity?.underlyingAssetIds[1]}`)

  const feeMarketData = useAppSelector(state => selectMarketDataById(state, osmosisAssetId))

  const accountFilter = useMemo(() => ({ accountId }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))
  const userAddress = useMemo(() => accountId && fromAccountId(accountId).account, [accountId])

  // user info
  const { state: walletState } = useWallet()

  // notify
  const toast = useToast()

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset?.assetId, accountId: accountId ?? '' }),
    [accountId, feeAsset?.assetId],
  )
  const feeAssetBalance = useAppSelector(s =>
    selectPortfolioCryptoHumanBalanceByFilter(s, feeAssetBalanceFilter),
  )

  const handleWithdraw = useCallback(async () => {
    if (
      !(
        contextDispatch &&
        state &&
        state.poolData &&
        userAddress &&
        assetReference &&
        walletState &&
        walletState.wallet &&
        supportsOsmosis(walletState.wallet) &&
        opportunity &&
        chainAdapter &&
        bip44Params
      )
    )
      return

    try {
      contextDispatch({ type: OsmosisWithdrawActionType.SET_LOADING, payload: true })

      const estimatedFees = await chainAdapter.getFeeData({ sendMax: false })
      const result = await (async () => {
        const fees = estimatedFees.average as FeeData<CosmosSdkChainId>
        const {
          chainSpecific: { gasLimit },
          txFee,
        } = fees

        if (!state.poolData || !state.poolData.id || !walletState.wallet) return
        const { accountNumber } = bip44Params

        return await chainAdapter.buildLPRemoveTransaction({
          poolId: state.poolData.id,
          shareOutAmount: state.withdraw.shareOutAmount,
          tokenOutMins: [
            {
              amount: state.withdraw.underlyingAsset0.amount,
              denom: state.withdraw.underlyingAsset0.denom,
            },
            {
              amount: state.withdraw.underlyingAsset1.amount,
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
    } catch (error) {
      moduleLogger.error({ fn: 'handleWithdraw', error }, 'Error removing liquidity')
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
    userAddress,
    assetReference,
    walletState,
    opportunity,
    chainAdapter,
    bip44Params,
    onNext,
    toast,
    translate,
  ])

  const handleCancel = useCallback(() => {
    onNext(DefiStep.Info)
  }, [onNext])

  const hasEnoughBalanceForGas = useMemo(
    () =>
      bnOrZero(feeAssetBalance)
        .minus(bnOrZero(state?.withdraw.estimatedFeeCrypto).div(`1e+${feeAsset.precision}`))
        .gte(0),
    [feeAssetBalance, state?.withdraw, feeAsset?.precision],
  )

  if (!state || !contextDispatch) return null

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
                value={state.withdraw.underlyingAsset0.amount}
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
                value={state.withdraw.underlyingAsset1.amount}
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
                value={bnOrZero(state.withdraw.estimatedFeeCrypto)
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='gray.500'
                value={bnOrZero(state.withdraw.estimatedFeeCrypto).toFixed(5)}
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
