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
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
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
  fromThorBaseUnit,
  getThorchainSaversPosition,
  getThorchainSaversWithdrawQuote,
  getWithdrawBps,
  THOR_PRECISION,
  toThorBaseUnit,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { serializeUserStakingId, toOpportunityId } from 'state/slices/opportunitiesSlice/utils'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'
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
  const [withdrawFee, setWithdrawFee] = useState<string>('')
  const [dustAmount, setDustAmount] = useState<string>('')
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

  // user info
  const { state: walletState } = useWallet()

  const assetBalanceFilter = useMemo(
    () => ({ assetId: asset?.assetId, accountId: accountId ?? '' }),
    [accountId, asset?.assetId],
  )
  const assetBalance = useAppSelector(s =>
    selectPortfolioCryptoHumanBalanceByFilter(s, assetBalanceFilter),
  )

  const selectedCurrency = useAppSelector(selectSelectedCurrency)

  // notify
  const toast = useToast()

  useEffect(() => {
    ;(async () => {
      if (!(accountId && opportunityData?.stakedAmountCryptoBaseUnit && asset)) return

      const amountCryptoBaseUnit = bnOrZero(state?.withdraw.cryptoAmount).times(
        bn(10).pow(asset.precision),
      )

      if (amountCryptoBaseUnit.isZero()) return

      const amountCryptoThorBaseUnit = toThorBaseUnit({
        valueCryptoBaseUnit: amountCryptoBaseUnit,
        asset,
      })

      const withdrawBps = getWithdrawBps({
        withdrawAmountCryptoBaseUnit: amountCryptoBaseUnit,
        stakedAmountCryptoBaseUnit: opportunityData.stakedAmountCryptoBaseUnit,
        rewardsamountCryptoBaseUnit: opportunityData?.rewardsAmountsCryptoBaseUnit?.[0] ?? '0',
      })

      const quote = await getThorchainSaversWithdrawQuote({ asset, accountId, bps: withdrawBps })

      const { dust_amount, expected_amount_out } = quote
      const withdrawFee = amountCryptoThorBaseUnit
        .minus(expected_amount_out)
        .div(bn(10).pow(THOR_PRECISION))

      const dustAmountCryptoPrecision = fromThorBaseUnit(dust_amount)

      setWithdrawFee(withdrawFee.toFixed())
      setDustAmount(dustAmountCryptoPrecision.toFixed(asset.precision))
    })()
  }, [
    accountId,
    asset,
    opportunityData?.rewardsAmountsCryptoBaseUnit,
    opportunityData?.stakedAmountCryptoBaseUnit,
    state?.withdraw.cryptoAmount,
  ])

  const getMaybeUtxoAccountAddress: () => Promise<string> = useCallback(async () => {
    if (!accountId) throw new Error('accountId is undefined')
    if (!isUtxoChainId(chainId)) return ''

    try {
      const position = await getThorchainSaversPosition({ accountId, assetId })
      const { asset_address } = position
      const accountAddress = chainId === bchChainId ? `bitcoincash:${asset_address}` : asset_address

      return accountAddress
    } catch (_e) {
      throw new Error(`Cannot get savers position for accountId: ${accountId}`)
    }
  }, [accountId, assetId, chainId])

  const getEstimateFeesArgs: () => Promise<EstimateFeesInput> = useCallback(async () => {
    if (!(accountId && opportunityData?.stakedAmountCryptoBaseUnit?.[0]))
      throw new Error('accountId is undefined')

    const amountCryptoBaseUnit = bnOrZero(state?.withdraw.cryptoAmount).times(
      bn(10).pow(asset.precision),
    )

    const withdrawBps = getWithdrawBps({
      withdrawAmountCryptoBaseUnit: amountCryptoBaseUnit,
      stakedAmountCryptoBaseUnit: opportunityData?.stakedAmountCryptoBaseUnit,
      rewardsamountCryptoBaseUnit: opportunityData?.rewardsAmountsCryptoBaseUnit?.[0] ?? '0',
    })
    const quote = await getThorchainSaversWithdrawQuote({ asset, accountId, bps: withdrawBps })

    const maybeUtxoAccountAddress = await getMaybeUtxoAccountAddress()

    if (isUtxoChainId(chainId) && !maybeUtxoAccountAddress) {
      throw new Error('Account address required to withdraw from THORChain savers')
    }

    const { expected_amount_out, dust_amount } = quote

    const amountCryptoThorBaseUnit = toThorBaseUnit({
      valueCryptoBaseUnit: amountCryptoBaseUnit,
      asset,
    })
    const withdrawFee = amountCryptoThorBaseUnit
      .minus(expected_amount_out)
      .div(bn(10).pow(asset.precision))

    setWithdrawFee(withdrawFee.toFixed())

    if (!quote) throw new Error('Cannot get THORCHain savers withdraw quote')

    return {
      from: maybeUtxoAccountAddress,
      cryptoAmount: fromThorBaseUnit(dust_amount).toFixed(asset.precision),
      asset,
      to: quote.inbound_address,
      sendMax: false,
      accountId,
      contractAddress: '',
    }
  }, [
    accountId,
    asset,
    chainId,
    getMaybeUtxoAccountAddress,
    opportunityData?.rewardsAmountsCryptoBaseUnit,
    opportunityData?.stakedAmountCryptoBaseUnit,
    state?.withdraw.cryptoAmount,
  ])

  const getPreWithdrawInput: () => Promise<SendInput | undefined> = useCallback(async () => {
    if (
      !(
        accountId &&
        assetId &&
        state?.withdraw?.estimatedGasCrypto &&
        opportunityData?.stakedAmountCryptoBaseUnit
      )
    )
      return

    try {
      const estimatedFees = await estimateFees(await getEstimateFeesArgs())
      const amountCryptoBaseUnit = bnOrZero(state?.withdraw.cryptoAmount).times(
        bn(10).pow(asset.precision),
      )

      const bps = getWithdrawBps({
        withdrawAmountCryptoBaseUnit: amountCryptoBaseUnit,
        stakedAmountCryptoBaseUnit: opportunityData?.stakedAmountCryptoBaseUnit,
        rewardsamountCryptoBaseUnit: opportunityData?.rewardsAmountsCryptoBaseUnit?.[0] ?? '0',
      })

      const quote = await getThorchainSaversWithdrawQuote({ asset, accountId, bps })
      const accountAddress = await getMaybeUtxoAccountAddress()

      const sendInput: SendInput = {
        cryptoAmount: '',
        asset,
        from: '', // Let coinselect do its magic here
        to: accountAddress,
        sendMax: true,
        accountId,
        amountFieldError: '',
        cryptoSymbol: asset.symbol,
        estimatedFees,
        feeType: FeeDataKey.Fast,
        fiatAmount: '',
        fiatSymbol: selectedCurrency,
        vanityAddress: '',
        input: quote.inbound_address,
      }

      return sendInput
    } catch (e) {
      moduleLogger.error({ fn: 'getDepositInput', e }, 'Error building THORChain savers Tx')
    }
  }, [
    accountId,
    assetId,
    state?.withdraw?.estimatedGasCrypto,
    state?.withdraw.cryptoAmount,
    opportunityData?.stakedAmountCryptoBaseUnit,
    opportunityData?.rewardsAmountsCryptoBaseUnit,
    getEstimateFeesArgs,
    asset,
    getMaybeUtxoAccountAddress,
    selectedCurrency,
  ])

  const getWithdrawInput: () => Promise<SendInput | undefined> = useCallback(async () => {
    if (!(accountId && assetId && opportunityData?.stakedAmountCryptoBaseUnit)) return

    try {
      const estimatedFees = await estimateFees(await getEstimateFeesArgs())
      const amountCryptoBaseUnit = bnOrZero(state?.withdraw.cryptoAmount).times(
        bn(10).pow(asset.precision),
      )

      const withdrawBps = getWithdrawBps({
        withdrawAmountCryptoBaseUnit: amountCryptoBaseUnit,
        stakedAmountCryptoBaseUnit: opportunityData?.stakedAmountCryptoBaseUnit,
        rewardsamountCryptoBaseUnit: opportunityData?.rewardsAmountsCryptoBaseUnit?.[0] ?? '0',
      })

      const quote = await getThorchainSaversWithdrawQuote({ asset, accountId, bps: withdrawBps })

      if (!quote) throw new Error('Error getting THORChain savers withdraw quote')

      const { dust_amount } = quote

      const maybeUtxoAccountAddress = await getMaybeUtxoAccountAddress()

      if (isUtxoChainId(chainId) && !maybeUtxoAccountAddress) {
        throw new Error('Account address required to withdraw from THORChain savers')
      }

      const sendInput: SendInput = {
        cryptoAmount: fromThorBaseUnit(dust_amount).toFixed(asset.precision),
        asset,
        to: quote.inbound_address,
        from: maybeUtxoAccountAddress,
        sendMax: false,
        accountId,
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
    opportunityData?.stakedAmountCryptoBaseUnit,
    opportunityData?.rewardsAmountsCryptoBaseUnit,
    getEstimateFeesArgs,
    state?.withdraw.cryptoAmount,
    asset,
    getMaybeUtxoAccountAddress,
    chainId,
    selectedCurrency,
  ])

  const handleMultiTxSend = useCallback(async (): Promise<string | undefined> => {
    if (!walletState.wallet) return

    // THORChain Txs need to always be sent from the same address, since the address (NOT the pubkey) is used to identify an active position
    // The way THORChain does this is by not being xpub-compliant, and only exposing a single address for UTXOs in their UI
    // All deposit/withdraws done from their UI are always done with one/many UTXOs from the same address, and change sent back to the same address
    // We also do this EXCLUSIVELY for THORChain Txs. The rest of the app uses xpubs, so the initially deposited from address isn't guaranteed to be populated
    // if users send other UTXO Txs in the meantime after depositing
    // Additionally, we select their highest balance UTXO address as a first deposit, which isn't guaranteed to contain enough value
    //
    // For both re/deposit flows, we will possibly need a pre-Tx to populate their highest UTXO/previously deposited from address with enough value

    const withdrawInput = await getWithdrawInput()
    if (!withdrawInput) throw new Error('Error building send input')

    // Try/catching and evaluating to something in the catch isn't a good pattern usually
    // In our case, handleSend() catching means that after all our previous checks, building a Tx failed at coinselect time
    // So we actually send reconciliate a reconciliate Tx, retry the original send within the same block
    // and finally evaluate to either the original Tx or a falsy empty string
    // 1. Try to deposit from the originally deposited from / highest UTXO balance address
    // If this is enough, no other Tx is needed
    const txId = await handleSend({
      sendInput: withdrawInput,
      wallet: walletState.wallet,
    }).catch(async () => {
      // 2. coinselect threw when building a Tx, meaning there's not enough value in the picked address - send funds to it
      const preWithdrawInput = await getPreWithdrawInput()
      if (!preWithdrawInput) throw new Error('Error building send input')

      return handleSend({
        sendInput: preWithdrawInput,
        wallet: walletState.wallet!,
      })
        .then(() =>
          // 3. Sign and broadcast the depooosit Tx again
          handleSend({
            sendInput: withdrawInput,
            wallet: walletState.wallet!,
          }).catch(_e => ''),
        )
        .catch(_e => '')
    })

    return txId
  }, [getPreWithdrawInput, getWithdrawInput, walletState.wallet])

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

      const maybeTxId = await handleMultiTxSend()
      if (!maybeTxId) {
        throw new Error('Error sending THORCHain savers Txs')
      }

      contextDispatch({ type: ThorchainSaversWithdrawActionType.SET_TXID, payload: maybeTxId })
      onNext(DefiStep.Status)
    } catch (error) {
      moduleLogger.debug({ fn: 'handleWithdraw' }, 'Error sending THORCHain savers Txs')
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
    handleMultiTxSend,
    onNext,
    toast,
    translate,
  ])

  const handleCancel = useCallback(() => {
    onNext(DefiStep.Info)
  }, [onNext])

  const hasEnoughBalanceForGas = useMemo(
    () =>
      bnOrZero(assetBalance)
        .minus(bnOrZero(state?.withdraw.estimatedGasCrypto).div(bn(10).pow(asset.precision)))
        .gte(0),
    [assetBalance, state?.withdraw.estimatedGasCrypto, asset?.precision],
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
                value={bnOrZero(withdrawFee).times(marketData.price).toFixed()}
              />
              <Amount.Crypto color='gray.500' value={withdrawFee} symbol={asset.symbol} />
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
              <Amount.Fiat
                fontWeight='bold'
                value={bn(dustAmount).times(marketData.price).toFixed(2)}
              />
              <Amount.Crypto color='gray.500' value={dustAmount} symbol={asset.symbol} />
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
