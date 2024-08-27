import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Link, Text, useToast } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { FeeDataEstimate } from '@shapeshiftoss/chain-adapters'
import { CONTRACT_INTERACTION, FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { assertAndProcessMemo, depositWithExpiry, SwapperName } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { selectInboundAddressData } from 'react-queries/selectors'
import { getAddress, zeroAddress } from 'viem'
import type { SendInput } from 'components/Modals/Send/Form'
import { estimateFees, handleSend } from 'components/Modals/Send/utils'
import { useLedgerOpenApp } from 'hooks/useLedgerOpenApp/useLedgerOpenApp'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { getTxLink } from 'lib/getTxLink'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { assertUnreachable, isToken } from 'lib/utils'
import { assertGetThorchainChainAdapter } from 'lib/utils/cosmosSdk'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
} from 'lib/utils/evm'
import { THORCHAIN_POOL_MODULE_ADDRESS } from 'lib/utils/thorchain/constants'
import { useGetEstimatedFeesQuery } from 'pages/Lending/hooks/useGetEstimatedFeesQuery'
import { THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectFeeAssetByChainId,
  selectSelectedCurrency,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import { fromThorBaseUnit, getThorchainTransactionType } from '..'

type Action =
  | 'swap'
  | 'addLiquidity'
  | 'withdrawLiquidity'
  | 'openLoan'
  | 'repayLoan'
  | 'depositSavers'
  | 'depositRunepool'
  | 'withdrawSavers'
  | 'withdrawRunepool'

type UseSendThorTxProps = {
  accountId: AccountId | null
  action: Action
  amountCryptoBaseUnit: string | null
  assetId: AssetId | undefined
  enableEstimateFees?: boolean
  disableEstimateFeesRefetch?: boolean
  fromAddress: string | null
  memo: string | null
}

export const useSendThorTx = ({
  accountId,
  action,
  amountCryptoBaseUnit,
  assetId,
  enableEstimateFees = true,
  disableEstimateFeesRefetch,
  fromAddress,
  memo: _memo,
}: UseSendThorTxProps) => {
  const [txId, setTxId] = useState<string | null>(null)
  const [serializedTxIndex, setSerializedTxIndex] = useState<string | null>(null)

  const checkLedgerAppOpenIfLedgerConnected = useLedgerOpenApp({ isSigning: true })
  const wallet = useWallet().state.wallet
  const toast = useToast()
  const translate = useTranslate()

  const selectedCurrency = useAppSelector(selectSelectedCurrency)
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, assetId ? fromAssetId(assetId).chainId : ''),
  )

  const accountNumberFilter = useMemo(() => {
    return { assetId, accountId: accountId ?? '' }
  }, [accountId, assetId])
  const accountNumber = useAppSelector(s => selectAccountNumberByAccountId(s, accountNumberFilter))

  const shouldUseDustAmount = useMemo(() => {
    return ['withdrawLiquidity', 'withdrawSavers'].includes(action)
  }, [action])

  // @TODO: test this with RUNEPool, might not work properly due to mapping for LPs
  const dustAmountCryptoBaseUnit = useMemo(() => {
    return THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT[feeAsset?.assetId ?? ''] ?? '0'
  }, [feeAsset])

  const amountOrDustCryptoBaseUnit = useMemo(() => {
    return shouldUseDustAmount ? dustAmountCryptoBaseUnit : bnOrZero(amountCryptoBaseUnit).toFixed()
  }, [shouldUseDustAmount, dustAmountCryptoBaseUnit, amountCryptoBaseUnit])

  const transactionType = useMemo(() => {
    return asset ? getThorchainTransactionType(asset.chainId) : undefined
  }, [asset])

  const memo = useMemo(() => _memo && assertAndProcessMemo(_memo), [_memo])

  const { data: inboundAddressData } = useQuery({
    ...reactQueries.thornode.inboundAddresses(),
    staleTime: 60_000,
    select: data => selectInboundAddressData(data, assetId),
    enabled: Boolean(assetId && assetId !== thorchainAssetId),
  })

  const inboundAddress = useMemo(() => {
    if (!transactionType) return

    switch (transactionType) {
      case 'MsgDeposit':
        return THORCHAIN_POOL_MODULE_ADDRESS
      case 'EvmCustomTx':
        return inboundAddressData?.router
      case 'Send':
        return inboundAddressData?.address
      default:
        assertUnreachable(transactionType)
    }
  }, [inboundAddressData, transactionType])

  const outboundFeeCryptoBaseUnit = useMemo(() => {
    if (!feeAsset || !inboundAddressData) return
    return toBaseUnit(fromThorBaseUnit(inboundAddressData.outbound_fee), feeAsset.precision)
  }, [feeAsset, inboundAddressData])

  const depositWithExpiryInputData = useMemo(() => {
    if (!memo) return
    if (!assetId) return
    if (!inboundAddressData?.address) return
    if (transactionType !== 'EvmCustomTx') return

    /**
     * asset address should be [zero address](https://dev.thorchain.org/concepts/sending-transactions.html#admonition-info-1)
     * for native asset (including dust) sends, otherwise token address for token sends
     *
     * _example of a failed tx using the token address instead of zero address when sending dust amount for a withdraw liquidity transactions:
     * https://www.tdly.co/shared/simulation/6d23d42a-8dd6-4e3e-88a8-62da779a765d_
     */
    const assetAddress =
      !isToken(assetId) || shouldUseDustAmount
        ? zeroAddress
        : getAddress(fromAssetId(assetId).assetReference)

    return depositWithExpiry({
      vault: getAddress(inboundAddressData.address),
      asset: assetAddress,
      amount: amountOrDustCryptoBaseUnit,
      memo,
      expiry: BigInt(dayjs().add(15, 'minute').unix()),
    })
  }, [
    amountOrDustCryptoBaseUnit,
    assetId,
    inboundAddressData,
    memo,
    shouldUseDustAmount,
    transactionType,
  ])

  const estimateFeesArgs = useMemo(() => {
    if (!accountId || !asset || !assetId || !feeAsset || !memo || !transactionType || !wallet)
      return

    const { account } = fromAccountId(accountId)

    switch (transactionType) {
      case 'MsgDeposit': {
        return {
          amountCryptoPrecision: fromBaseUnit(amountOrDustCryptoBaseUnit, asset.precision),
          assetId: asset.assetId,
          feeAssetId: feeAsset.assetId,
          memo,
          to: THORCHAIN_POOL_MODULE_ADDRESS,
          sendMax: false,
          accountId,
          contractAddress: undefined,
        }
      }
      case 'EvmCustomTx': {
        if (!inboundAddressData?.router) return
        if (!depositWithExpiryInputData) return

        return {
          amountCryptoPrecision:
            !isToken(assetId) || shouldUseDustAmount
              ? fromBaseUnit(amountOrDustCryptoBaseUnit, feeAsset.precision)
              : '0',
          assetId: shouldUseDustAmount ? feeAsset.assetId : asset.assetId,
          feeAssetId: feeAsset.assetId,
          to: inboundAddressData.router,
          from: account,
          sendMax: false,
          memo: depositWithExpiryInputData,
          accountId,
          // contractAddress is only used for erc20 sends to construct the transfer method input data
          // we are already providing the necessary input data to perform the depositWithExpiry transaction
          contractAddress: undefined,
        }
      }
      case 'Send': {
        if (fromAddress === null) return
        if (!inboundAddressData?.address) return

        return {
          amountCryptoPrecision: fromBaseUnit(amountOrDustCryptoBaseUnit, asset.precision),
          assetId,
          feeAssetId: feeAsset.assetId,
          to: inboundAddressData.address,
          from: fromAddress,
          sendMax: false,
          memo,
          accountId,
          contractAddress: undefined,
        }
      }
      default:
        assertUnreachable(transactionType)
    }
  }, [
    accountId,
    amountOrDustCryptoBaseUnit,
    asset,
    assetId,
    depositWithExpiryInputData,
    feeAsset,
    fromAddress,
    inboundAddressData,
    memo,
    shouldUseDustAmount,
    transactionType,
    wallet,
  ])

  const {
    data: estimatedFeesData,
    isLoading: isEstimatedFeesDataLoading,
    isError: isEstimatedFeesDataError,
  } = useGetEstimatedFeesQuery({
    amountCryptoPrecision: estimateFeesArgs?.amountCryptoPrecision ?? '0',
    assetId: estimateFeesArgs?.assetId ?? '',
    feeAssetId: estimateFeesArgs?.feeAssetId ?? '',
    to: estimateFeesArgs?.to ?? '',
    sendMax: estimateFeesArgs?.sendMax ?? false,
    memo: estimateFeesArgs?.memo ?? '',
    accountId: estimateFeesArgs?.accountId ?? '',
    contractAddress: estimateFeesArgs?.contractAddress ?? '',
    enabled: Boolean(estimateFeesArgs && enableEstimateFees),
    disableRefetch: Boolean(txId || disableEstimateFeesRefetch),
  })

  const executeTransaction = useCallback(async () => {
    if (!memo) return
    if (!asset) return
    if (!wallet) return
    if (!accountId) return
    if (!transactionType) return
    if (!estimateFeesArgs) return
    if (isToken(asset.assetId) && !inboundAddressData) return

    await checkLedgerAppOpenIfLedgerConnected(asset.chainId)
    if (accountNumber === undefined) return

    if (
      action !== 'withdrawRunepool' &&
      !shouldUseDustAmount &&
      !bn(amountOrDustCryptoBaseUnit).gt(0)
    )
      throw new Error('invalid amount specified')

    const { account } = fromAccountId(accountId)

    const { _txId, _serializedTxIndex } = await (async () => {
      switch (transactionType) {
        case 'MsgDeposit': {
          const adapter = assertGetThorchainChainAdapter()

          const estimatedFees = await estimateFees(estimateFeesArgs)
          const { fast } = estimatedFees as FeeDataEstimate<KnownChainIds.ThorchainMainnet>

          const { txToSign } = await adapter.buildDepositTransaction({
            from: account,
            accountNumber,
            value: amountOrDustCryptoBaseUnit,
            memo,
            chainSpecific: {
              gas: fast.chainSpecific.gasLimit,
              fee: fast.txFee,
            },
          })

          const signedTx = await adapter.signTransaction({ txToSign, wallet })

          const _txId = await adapter.broadcastTransaction({
            senderAddress: account,
            receiverAddress: THORCHAIN_POOL_MODULE_ADDRESS,
            hex: signedTx,
          })

          return {
            _txId,
            _serializedTxIndex: serializeTxIndex(accountId, _txId, account, {
              memo,
              parser: 'thorchain',
            }),
          }
        }
        case 'EvmCustomTx': {
          if (!inboundAddressData?.address) throw new Error('No vault address found')
          if (!inboundAddressData?.router) throw new Error('No router address found')
          if (!depositWithExpiryInputData) throw new Error('No depositWithExpiry input data found')

          const adapter = assertGetEvmChainAdapter(asset.chainId)

          const buildCustomTxInput = await createBuildCustomTxInput({
            accountNumber,
            from: account,
            adapter,
            data: depositWithExpiryInputData,
            value:
              !isToken(asset.assetId) || shouldUseDustAmount ? amountOrDustCryptoBaseUnit : '0',
            to: inboundAddressData.router,
            wallet,
          })

          const _txId = await buildAndBroadcast({
            adapter,
            buildCustomTxInput,
            receiverAddress: CONTRACT_INTERACTION, // no receiver for this contract call
          })

          return {
            _txId,
            _serializedTxIndex: serializeTxIndex(accountId, _txId, account),
          }
        }
        case 'Send': {
          if (fromAddress === null) throw new Error('No account address found')
          if (!inboundAddressData?.address) throw new Error('No vault address found')

          const estimatedFees = await estimateFees(estimateFeesArgs)

          const sendInput: SendInput = {
            amountCryptoPrecision: fromBaseUnit(amountOrDustCryptoBaseUnit, asset.precision),
            assetId: asset.assetId,
            to: inboundAddressData?.address,
            from: fromAddress,
            sendMax: false,
            accountId,
            memo,
            amountFieldError: '',
            estimatedFees,
            feeType: FeeDataKey.Fast,
            fiatAmount: '',
            fiatSymbol: selectedCurrency,
            vanityAddress: '',
            input: '',
          }

          const _txId = await handleSend({
            sendInput,
            wallet,
          })

          return {
            _txId,
            _serializedTxIndex: serializeTxIndex(accountId, _txId, account),
          }
        }
        default:
          assertUnreachable(transactionType)
      }
    })()

    const _txIdLink = getTxLink({
      defaultExplorerBaseUrl: 'https://viewblock.io/thorchain/tx/',
      txId: _txId ?? '',
      name: SwapperName.Thorchain,
    })

    toast({
      title: translate('modals.send.transactionSent'),
      description: _txId ? (
        <Text>
          <Link href={_txIdLink} isExternal>
            {translate('modals.status.viewExplorer')} <ExternalLinkIcon mx='2px' />
          </Link>
        </Text>
      ) : undefined,
      status: 'success',
      duration: 9000,
      isClosable: true,
      position: 'top-right',
    })

    setTxId(_txId)
    setSerializedTxIndex(_serializedTxIndex)

    return _txId
  }, [
    memo,
    asset,
    wallet,
    accountId,
    transactionType,
    estimateFeesArgs,
    accountNumber,
    inboundAddressData,
    action,
    shouldUseDustAmount,
    amountOrDustCryptoBaseUnit,
    toast,
    translate,
    depositWithExpiryInputData,
    checkLedgerAppOpenIfLedgerConnected,
    fromAddress,
    selectedCurrency,
  ])

  return {
    executeTransaction,
    estimatedFeesData,
    isEstimatedFeesDataLoading,
    isEstimatedFeesDataError,
    txId,
    serializedTxIndex,
    dustAmountCryptoBaseUnit,
    outboundFeeCryptoBaseUnit,
    inboundAddress,
  }
}
