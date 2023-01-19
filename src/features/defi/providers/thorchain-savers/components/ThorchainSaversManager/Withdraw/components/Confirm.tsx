import { Alert, AlertIcon, Box, Stack, useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { bchChainId, fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { SwapperName } from '@shapeshiftoss/swapper'
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
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import type { SendInput } from 'components/Modals/Send/Form'
import type { EstimateFeesInput } from 'components/Modals/Send/utils'
import { estimateFees, handleSend } from 'components/Modals/Send/utils'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { getIsTradingActiveApi } from 'state/apis/swapper/getIsTradingActiveApi'
import {
  getThorchainSaversPosition,
  getThorchainSaversWithdrawQuote,
  getWithdrawBps,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAssetById,
  selectBIP44ParamsByAccountId,
  selectEarnUserStakingOpportunityByUserStakingId,
  selectHighestBalanceAccountIdByStakingId,
  selectMarketDataById,
  selectPortfolioCryptoHumanBalanceByFilter,
  selectSelectedCurrency,
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { ThorchainSaversWithdrawActionType } from '../WithdrawCommon'
import { WithdrawContext } from '../WithdrawContext'

const moduleLogger = logger.child({
  namespace: [
    'Defi',
    'Providers',
    'ThorchainSavers',
    'ThorchainSaversManager',
    'Withdraw',
    'Confirm',
  ],
})

type ConfirmProps = { accountId: AccountId | undefined } & StepComponentProps

export const Confirm: React.FC<ConfirmProps> = ({ accountId, onNext }) => {
  const { state, dispatch: contextDispatch } = useContext(WithdrawContext)
  const appDispatch = useAppDispatch()
  const translate = useTranslate()
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const opportunity = state?.opportunity
  const chainAdapter = getChainAdapterManager().get(chainId)

  // Asset info
  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })

  const opportunityId = useMemo(
    () => toOpportunityId({ chainId, assetNamespace, assetReference }),
    [assetNamespace, assetReference, chainId],
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
          assetNamespace,
          assetReference,
        }),
      ),
    }),
    [accountId, assetNamespace, assetReference, chainId, highestBalanceAccountId],
  )

  const opportunityData = useAppSelector(state =>
    selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId ?? ''))

  const accountFilter = useMemo(() => ({ accountId }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))
  const userAddress = useMemo(() => accountId && fromAccountId(accountId).account, [accountId])

  if (!asset) throw new Error(`Asset not found for AssetId ${opportunityData?.assetId}`)
  if (!asset) throw new Error(`Fee asset not found for AssetId ${assetId}`)

  // user info
  const { state: walletState } = useWallet()

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: asset?.assetId, accountId: accountId ?? '' }),
    [accountId, asset?.assetId],
  )
  const feeAssetBalance = useAppSelector(s =>
    selectPortfolioCryptoHumanBalanceByFilter(s, feeAssetBalanceFilter),
  )

  const selectedCurrency = useAppSelector(selectSelectedCurrency)

  // notify
  const toast = useToast()

  const getAccountAddress: () => Promise<string> = useCallback(async () => {
    if (!accountId) throw new Error('accountId is undefined')
    try {
      const position = await getThorchainSaversPosition(accountId, assetId)
      const { asset_address } = position
      const accountAddress = chainId === bchChainId ? `bitcoincash:${asset_address}` : asset_address

      return accountAddress
    } catch (_e) {
      throw new Error(`Cannot get savers position for accountId: ${accountId}`)
    }
  }, [accountId, assetId, chainId])

  const getEstimateFeesArgs: () => Promise<EstimateFeesInput> = useCallback(async () => {
    if (!accountId) throw new Error('accountId is undefined')

    const amountCryptoBaseUnit = bnOrZero(state?.withdraw.cryptoAmount).times(
      bn(10).pow(asset.precision),
    )

    const withdrawBps = getWithdrawBps(
      amountCryptoBaseUnit,
      opportunityData?.stakedAmountCryptoBaseUnit,
      opportunityData?.rewardsAmountsCryptoBaseUnit?.[0],
    )
    const quote = await getThorchainSaversWithdrawQuote(asset, accountId, withdrawBps)

    const { dust_amount } = quote

    if (!quote) throw new Error('Cannot get THORCHain savers withdraw quote')

    return {
      cryptoAmount: dust_amount,
      asset,
      to: quote.inbound_address,
      sendMax: false,
      accountId: accountId ?? '',
      contractAddress: '',
    }
  }, [
    accountId,
    asset,
    opportunityData?.rewardsAmountsCryptoBaseUnit,
    opportunityData?.stakedAmountCryptoBaseUnit,
    state?.withdraw.cryptoAmount,
  ])

  const getWithdrawInput: () => Promise<SendInput | undefined> = useCallback(async () => {
    if (!(accountId && assetId)) return

    try {
      const estimatedFees = await estimateFees(await getEstimateFeesArgs())
      const amountCryptoBaseUnit = bnOrZero(state?.withdraw.cryptoAmount).times(
        bn(10).pow(asset.precision),
      )

      const withdrawBps = getWithdrawBps(
        amountCryptoBaseUnit,
        opportunityData?.stakedAmountCryptoBaseUnit,
        opportunityData?.rewardsAmountsCryptoBaseUnit?.[0],
      )

      const quote = await getThorchainSaversWithdrawQuote(asset, accountId, withdrawBps)

      if (!quote) throw new Error('Error getting THORChain savers withdraw quote')

      const { dust_amount } = quote

      const accountAddress = await getAccountAddress()

      const sendInput: SendInput = {
        cryptoAmount: dust_amount,
        asset,
        to: quote.inbound_address,
        from: accountAddress,
        sendMax: false,
        accountId: accountId ?? '',
        amountFieldError: '',
        cryptoSymbol: asset?.symbol ?? '',
        estimatedFees,
        feeType: FeeDataKey.Fast,
        fiatAmount: '',
        fiatSymbol: selectedCurrency,
        vanityAddress: '',
        input: quote.inbound_address,
      }

      return sendInput
    } catch (e) {
      moduleLogger.error({ fn: 'getSendInput', e }, 'Error building THORChain savers Tx')
    }
  }, [
    accountId,
    assetId,
    getEstimateFeesArgs,
    state?.withdraw.cryptoAmount,
    asset,
    opportunityData?.stakedAmountCryptoBaseUnit,
    opportunityData?.rewardsAmountsCryptoBaseUnit,
    getAccountAddress,
    selectedCurrency,
  ])

  const handleConfirm = useCallback(async () => {
    if (!contextDispatch || !bip44Params || !accountId || !assetId) return
    try {
      if (
        !(
          userAddress &&
          assetReference &&
          walletState.wallet &&
          supportsETH(walletState.wallet) &&
          opportunity &&
          chainAdapter
        )
      )
        return

      contextDispatch({ type: ThorchainSaversWithdrawActionType.SET_LOADING, payload: true })
      if (!state?.withdraw.cryptoAmount) return

      const { getIsTradingActive } = getIsTradingActiveApi.endpoints
      const { data: isTradingActive } = await appDispatch(
        getIsTradingActive.initiate({
          assetId,
          swapperName: SwapperName.Thorchain,
        }),
      )

      if (!isTradingActive) {
        throw new Error(`THORChain pool halted for assetId: ${assetId}`)
      }

      const withdrawInput = await getWithdrawInput()
      if (!withdrawInput) throw new Error('Error building send input')

      const maybeTxId = await handleSend({ sendInput: withdrawInput, wallet: walletState.wallet })

      if (!maybeTxId) {
        throw new Error('Error sending THORCHain savers Txs')
      }

      contextDispatch({ type: ThorchainSaversWithdrawActionType.SET_TXID, payload: maybeTxId })
      onNext(DefiStep.Status)
    } catch (error) {
      moduleLogger.debug({ fn: 'handleWithdraw' }, 'Error sending THORCHain savers Txs')
      // TODO(gomes): UTXO reconciliation in a stacked PR
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      contextDispatch({ type: ThorchainSaversWithdrawActionType.SET_LOADING, payload: false })
    }
  }, [
    contextDispatch,
    bip44Params,
    accountId,
    assetId,
    userAddress,
    assetReference,
    walletState.wallet,
    opportunity,
    chainAdapter,
    state?.withdraw.cryptoAmount,
    appDispatch,
    getWithdrawInput,
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
        .minus(bnOrZero(state?.withdraw.estimatedGasCrypto).div(`1e+${asset.precision}`))
        .gte(0),
    [feeAssetBalance, state?.withdraw.estimatedGasCrypto, asset?.precision],
  )

  if (!state || !contextDispatch) return null

  return (
    <ReusableConfirm
      onCancel={handleCancel}
      headerText='modals.confirm.withdraw.header'
      isDisabled={!hasEnoughBalanceForGas}
      loading={state.loading}
      loadingText={translate('common.confirm')}
      onConfirm={handleConfirm}
    >
      <Summary>
        <Row variant='vertical' p={4}>
          <Row.Label>
            <Text translation='modals.confirm.amountToWithdraw' />
          </Row.Label>
          <Row px={0} fontWeight='medium'>
            <Stack direction='row' alignItems='center'>
              <AssetIcon size='xs' src={asset.icon} />
              <RawText>{asset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.withdraw.cryptoAmount} symbol={asset.symbol} />
            </Row.Value>
          </Row>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <HelperTooltip label={translate('defi.modals.saversVaults.estimatedFeeTooltip')}>
              <Text translation='defi.modals.saversVaults.estimatedFee' />
            </HelperTooltip>
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat
                fontWeight='bold'
                value={bnOrZero(state.withdraw.estimatedGasCrypto)
                  .div(`1e+${asset.precision}`)
                  .times(marketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='gray.500'
                value={bnOrZero(state.withdraw.estimatedGasCrypto)
                  .div(`1e+${asset.precision}`)
                  .toFixed(5)}
                symbol={asset.symbol}
              />
            </Box>
          </Row.Value>
        </Row>
        <Row variant='gutter'>
          <Row.Label>
            <HelperTooltip label={translate('defi.modals.saversVaults.dustAmountTooltip')}>
              <Text translation='defi.modals.saversVaults.dustAmount' />
            </HelperTooltip>
          </Row.Label>
          <Row.Value>
            <Box textAlign='right'>
              <Amount.Fiat fontWeight='bold' value='0' />
              <Amount.Crypto color='gray.500' value='0' symbol={asset.symbol} />
            </Box>
          </Row.Value>
        </Row>
        {!hasEnoughBalanceForGas && (
          <Alert status='error' borderRadius='lg'>
            <AlertIcon />
            <Text translation={['modals.confirm.notEnoughGas', { assetSymbol: asset.symbol }]} />
          </Alert>
        )}
      </Summary>
    </ReusableConfirm>
  )
}
