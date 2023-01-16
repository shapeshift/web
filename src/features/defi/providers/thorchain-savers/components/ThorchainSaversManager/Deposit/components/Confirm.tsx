import { Alert, AlertIcon, Box, Stack, useToast } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import { bchChainId, fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { Confirm as ReusableConfirm } from 'features/defi/components/Confirm/Confirm'
import { Summary } from 'features/defi/components/Summary'
import type {
  DefiParams,
  ThorchainSaversDefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction, DefiStep } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
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
import {
  getThorchainSaversPosition,
  getThorchainSaversQuote,
} from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'
import {
  selectAssetById,
  selectBIP44ParamsByAccountId,
  selectMarketDataById,
  selectPortfolioCryptoHumanBalanceByFilter,
  selectSelectedCurrency,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ReconciliationType } from '../../UtxoReconciliate/UtxoReconciliate'
import { ThorchainSaversDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

const moduleLogger = logger.child({ namespace: ['ThorchainSaversDeposit:Confirm'] })

type ConfirmProps = { accountId: AccountId | undefined } & StepComponentProps

export const Confirm: React.FC<ConfirmProps> = ({ accountId, onNext }) => {
  const { state, dispatch } = useContext(DepositContext)
  const translate = useTranslate()
  // TODO: Allow user to set fee priority
  const { query, location, history } = useBrowserRouter<
    ThorchainSaversDefiQueryParams,
    DefiParams
  >()
  const { chainId, assetNamespace, assetReference } = query
  const opportunity = useMemo(() => state?.opportunity, [state])
  const chainAdapter = getChainAdapterManager().get(chainId)

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const feeAssetId = assetId

  const [maybeAccountAddress, setMaybeAccountAddress] = useState<string>('')
  const asset: Asset | undefined = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetId ?? ''))

  const accountFilter = useMemo(() => ({ accountId }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))
  const userAddress = useMemo(() => accountId && fromAccountId(accountId).account, [accountId])

  // user info
  const { state: walletState } = useWallet()

  // notify
  const toast = useToast()

  const feeAssetBalanceFilter = useMemo(
    () => ({ assetId: feeAsset?.assetId, accountId }),
    [accountId, feeAsset?.assetId],
  )
  const feeAssetBalance = useAppSelector(s =>
    selectPortfolioCryptoHumanBalanceByFilter(s, feeAssetBalanceFilter),
  )

  const selectedCurrency = useAppSelector(selectSelectedCurrency)

  const getEstimateFeesArgs: () => Promise<EstimateFeesInput> = useCallback(async () => {
    const amountCryptoBaseUnit = bnOrZero(state?.deposit.cryptoAmount).times(
      bn(10).pow(asset.precision),
    )
    const quote = await getThorchainSaversQuote(asset, amountCryptoBaseUnit)

    return {
      cryptoAmount: state?.deposit.cryptoAmount ?? '',
      asset,
      to: quote.inbound_address,
      sendMax: false,
      accountId: accountId ?? '',
      contractAddress: '',
    }
  }, [accountId, asset, state?.deposit.cryptoAmount])

  useEffect(() => {
    if (!accountId) return
    ;(async () => {
      const accountAddress = isUtxoChainId(chainId)
        ? await getThorchainSaversPosition(accountId, assetId)
            .then(({ asset_address }) =>
              chainId === bchChainId ? `bitcoincash:${asset_address}` : asset_address,
            )
            .catch(() => '')
        : ''
      setMaybeAccountAddress(accountAddress)
    })()
  }, [chainId, accountId, assetId])

  const getSendInput: () => Promise<SendInput | undefined> = useCallback(async () => {
    if (!(accountId && assetId)) return

    try {
      const estimatedFees = await estimateFees(await getEstimateFeesArgs())
      const amountCryptoBaseUnit = bnOrZero(state?.deposit.cryptoAmount).times(
        bn(10).pow(asset.precision),
      )
      const quote = await getThorchainSaversQuote(asset, amountCryptoBaseUnit)

      // TODO: beard oil on the flow?
      const sendInput: SendInput = {
        cryptoAmount: state?.deposit.cryptoAmount ?? '',
        asset,
        to: quote.inbound_address,
        from: maybeAccountAddress,
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
    maybeAccountAddress,
    accountId,
    asset,
    assetId,
    getEstimateFeesArgs,
    selectedCurrency,
    state?.deposit.cryptoAmount,
  ])

  const handleDeposit = useCallback(async () => {
    if (!dispatch || !bip44Params || !accountId || !assetId) return
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

      dispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: true })
      if (!state?.deposit.cryptoAmount) return

      const sendInput = await getSendInput()
      if (!sendInput) throw new Error('Error building send input')

      const maybeTxId = await handleSend({
        sendInput,
        wallet: walletState.wallet,
      })

      dispatch({ type: ThorchainSaversDepositActionType.SET_TXID, payload: maybeTxId })
      onNext(DefiStep.Status)
    } catch (error) {
      moduleLogger.debug({ fn: 'handleDeposit' }, 'Error sending THORCHain savers Tx')
      // TODO(gomes): UTXO reconciliation in a stacked PR
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      dispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: false })
    }
  }, [
    dispatch,
    bip44Params,
    accountId,
    assetId,
    userAddress,
    assetReference,
    walletState.wallet,
    opportunity,
    chainAdapter,
    state,
    getSendInput,
    onNext,
    toast,
    translate,
    history,
    location.pathname,
    query,
    maybeAccountAddress,
  ])

  const handleCancel = useCallback(() => {
    onNext(DefiStep.Info)
  }, [onNext])

  const hasEnoughBalanceForGas = useMemo(
    () =>
      bnOrZero(feeAssetBalance)
        .minus(bnOrZero(state?.deposit.estimatedGasCrypto).div(`1e+${feeAsset.precision}`))
        .gte(0),
    [feeAssetBalance, state?.deposit, feeAsset?.precision],
  )

  if (!state || !dispatch) return null

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
              <AssetIcon size='xs' src={asset.icon} />
              <RawText>{asset.name}</RawText>
            </Stack>
            <Row.Value>
              <Amount.Crypto value={state.deposit.cryptoAmount} symbol={asset.symbol} />
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
                value={bnOrZero(state.deposit.estimatedGasCrypto)
                  .div(`1e+${feeAsset.precision}`)
                  .times(feeMarketData.price)
                  .toFixed(2)}
              />
              <Amount.Crypto
                color='gray.500'
                value={bnOrZero(state.deposit.estimatedGasCrypto)
                  .div(`1e+${feeAsset.precision}`)
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
