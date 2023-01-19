import { Alert, AlertIcon, Box, Stack, useToast } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import { bchChainId, fromAccountId, toAssetId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { SwapperName } from '@shapeshiftoss/swapper/dist/api'
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
  getAccountAddressesWithBalances,
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
import { useAppDispatch, useAppSelector } from 'state/store'

import { ThorchainSaversDepositActionType } from '../DepositCommon'
import { DepositContext } from '../DepositContext'

const moduleLogger = logger.child({ namespace: ['ThorchainSaversDeposit:Confirm'] })

type ConfirmProps = { accountId: AccountId | undefined } & StepComponentProps

export const Confirm: React.FC<ConfirmProps> = ({ accountId, onNext }) => {
  const { state, dispatch: contextDispatch } = useContext(DepositContext)
  const appDispatch = useAppDispatch()
  const translate = useTranslate()
  // TODO: Allow user to set fee priority
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetNamespace, assetReference } = query
  const opportunity = useMemo(() => state?.opportunity, [state])
  const chainAdapter = getChainAdapterManager().get(chainId)

  const assetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const feeAssetId = assetId

  const [maybeFromUTXOAccountAddress, setMaybeFromUTXOAccountAddress] = useState<string>('')
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
    if (!accountId) throw new Error('accountId required')

    if (!state?.deposit.cryptoAmount) {
      throw new Error('Cannot send 0-value THORCHain savers Tx')
    }

    const amountCryptoBaseUnit = bnOrZero(state.deposit.cryptoAmount).times(
      bn(10).pow(asset.precision),
    )
    const quote = await getThorchainSaversQuote(asset, amountCryptoBaseUnit)

    return {
      cryptoAmount: state.deposit.cryptoAmount,
      asset,
      to: quote.inbound_address,
      sendMax: false,
      accountId,
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
            .catch(async () => {
              const addressesWithBalances = await getAccountAddressesWithBalances(accountId)
              const highestBalanceAccount = addressesWithBalances.sort((a, b) =>
                bnOrZero(a.balance).gte(bnOrZero(b.balance)) ? -1 : 1,
              )[0].address

              return highestBalanceAccount
            })
        : ''
      setMaybeFromUTXOAccountAddress(accountAddress)
    })()
  }, [chainId, accountId, assetId])

  const getDepositInput: () => Promise<SendInput | undefined> = useCallback(async () => {
    if (!(accountId && assetId)) return
    if (!state?.deposit.cryptoAmount) {
      throw new Error('Cannot send 0-value THORCHain savers Tx')
    }

    try {
      const estimatedFees = await estimateFees(await getEstimateFeesArgs())
      const amountCryptoBaseUnit = bnOrZero(state.deposit.cryptoAmount).times(
        bn(10).pow(asset.precision),
      )
      const quote = await getThorchainSaversQuote(asset, amountCryptoBaseUnit)

      const sendInput: SendInput = {
        cryptoAmount: state.deposit.cryptoAmount,
        asset,
        to: quote.inbound_address,
        from: maybeFromUTXOAccountAddress,
        sendMax: false,
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
      moduleLogger.error({ fn: 'getSendInput', e }, 'Error building THORChain savers Tx')
    }
  }, [
    maybeFromUTXOAccountAddress,
    accountId,
    asset,
    assetId,
    getEstimateFeesArgs,
    selectedCurrency,
    state?.deposit.cryptoAmount,
  ])

  const getPreDepositInput: () => Promise<SendInput | undefined> = useCallback(async () => {
    if (!(accountId && assetId && state?.deposit?.estimatedGasCrypto)) return

    try {
      const estimatedFees = await estimateFees(await getEstimateFeesArgs())
      const amountCryptoBaseUnit = bnOrZero(state?.deposit.cryptoAmount).times(
        bn(10).pow(asset.precision),
      )
      const quote = await getThorchainSaversQuote(asset, amountCryptoBaseUnit)

      const sendInput: SendInput = {
        cryptoAmount: '',
        asset,
        from: '', // Let coinselect do its magic here
        to: maybeFromUTXOAccountAddress,
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
      moduleLogger.error({ fn: 'getSendInput', e }, 'Error building THORChain savers Tx')
    }
  }, [
    maybeFromUTXOAccountAddress,
    accountId,
    assetId,
    getEstimateFeesArgs,
    state?.deposit.cryptoAmount,
    state?.deposit?.estimatedGasCrypto,
    asset,
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

    const depositInput = await getDepositInput()
    if (!depositInput) throw new Error('Error building send input')

    let txId: string

    try {
      // 1. Try to deposit from the originally deposited from / highest UTXO balance address
      // If this is enough, no other Tx is needed
      txId = await handleSend({
        sendInput: depositInput,
        wallet: walletState.wallet,
      })
    } catch (e) {
      // 2. signAndBroadcastTransaction threw, meaning there's not enough value in the picked address - send funds to it
      const preDepositInput = await getPreDepositInput()
      if (!preDepositInput) throw new Error('Error building send input')
      txId = await handleSend({
        sendInput: preDepositInput,
        wallet: walletState.wallet,
      })
      // 3. Sign and broadcast the depooosit Tx again
      txId = await handleSend({
        sendInput: depositInput,
        wallet: walletState.wallet,
      }).catch(_e => '')
    }

    return txId
  }, [getDepositInput, getPreDepositInput, walletState.wallet])
  useEffect(() => {
    if (!accountId) return
    ;(async () => {
      const accountAddress = isUtxoChainId(chainId)
        ? await getThorchainSaversPosition(accountId, assetId)
            .then(({ asset_address }) =>
              chainId === bchChainId ? `bitcoincash:${asset_address}` : asset_address,
            )
            .catch(async () => {
              const addressesWithBalances = await getAccountAddressesWithBalances(accountId)
              const highestBalanceAccount = addressesWithBalances.sort((a, b) =>
                bnOrZero(a.balance).gte(bnOrZero(b.balance)) ? -1 : 1,
              )[0].address

              return highestBalanceAccount
            })
        : ''
      setMaybeFromUTXOAccountAddress(accountAddress)
    })()
  }, [chainId, accountId, assetId])

  const handleDeposit = useCallback(async () => {
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

      if (!state?.deposit.cryptoAmount) {
        throw new Error('Cannot send 0-value THORCHain savers Tx')
      }

      contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: true })

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

      const depositInput = await getDepositInput()
      if (!depositInput) throw new Error('Error building send input')

      const maybeTxId = await handleMultiTxSend()

      if (!maybeTxId) {
        throw new Error('Error sending THORCHain savers Txs')
      }

      contextDispatch({ type: ThorchainSaversDepositActionType.SET_TXID, payload: maybeTxId })
      onNext(DefiStep.Status)
    } catch (error) {
      moduleLogger.debug({ fn: 'handleDeposit' }, 'Error sending THORCHain savers Txs')
      // TODO(gomes): UTXO reconciliation in a stacked PR
      toast({
        position: 'top-right',
        description: translate('common.transactionFailedBody'),
        title: translate('common.transactionFailed'),
        status: 'error',
      })
    } finally {
      contextDispatch({ type: ThorchainSaversDepositActionType.SET_LOADING, payload: false })
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
    state?.deposit.cryptoAmount,
    appDispatch,
    getDepositInput,
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
      bnOrZero(feeAssetBalance)
        .minus(bnOrZero(state?.deposit.estimatedGasCrypto).div(`1e+${feeAsset.precision}`))
        .gte(0),
    [feeAssetBalance, state?.deposit, feeAsset?.precision],
  )

  if (!state || !contextDispatch) return null

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
