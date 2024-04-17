import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Link, Text, useToast } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import {
  CONTRACT_INTERACTION,
  type FeeDataEstimate,
  FeeDataKey,
} from '@shapeshiftoss/chain-adapters'
import { SwapperName } from '@shapeshiftoss/swapper'
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
import { useWallet } from 'hooks/useWallet/useWallet'
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
import { depositWithExpiry } from 'lib/utils/thorchain/routerCalldata'
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

type ThorfiActionBase = 'ThorchainLp' | 'ThorchainLending' | 'ThorchainSavers'
// Since there are different vernaculars (borrow/repay, deposit/withdraw) depending on the Thorfi action, we simplyfi it as enter/exit
// Note, THORChain swaps *are* part of THORFi but there's no notion of enter/exit for them really
type ThorfiAction = `${ThorfiActionBase}Enter` | `${ThorfiActionBase}Exit` | 'ThorchainSwap'

type Props = {
  amountCryptoBaseUnit: string | undefined
  dustAmountCryptoBaseUnit: string | undefined
  assetId: AssetId
  memo: string | undefined
  accountId: AccountId
  transactionType: 'MsgDeposit' | 'EvmCustomTx' | 'Send' | undefined
  assetAddress: string | null
  thorfiAction: ThorfiAction
  // Indicates whether the consumer is currently submitting, meaning we should stop refetching
  isSubmitting?: boolean
}

export const useSendThorTx = ({
  amountCryptoBaseUnit,
  dustAmountCryptoBaseUnit,
  assetId, // i.e the AssetId of the Tx, either native asset, or token to be sent from the contract, assuming allowance has been set
  memo,
  accountId,
  transactionType,
  assetAddress,
  thorfiAction,
  isSubmitting = false,
}: Props) => {
  // TODO(gomes): savers sometimes also use dust amounts, ensure this works for them
  const shouldUseDustAmount = thorfiAction === 'ThorchainLpExit'
  const [txId, setTxId] = useState<string | null>(null)
  const [serializedTxIndex, setSerializedTxIndex] = useState<string | null>(null)
  const wallet = useWallet().state.wallet
  const toast = useToast()
  const translate = useTranslate()

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(assetId).chainId),
  )

  const accountNumberFilter = useMemo(() => ({ assetId, accountId }), [accountId, assetId])
  const accountNumber = useAppSelector(s => selectAccountNumberByAccountId(s, accountNumberFilter))
  const selectedCurrency = useAppSelector(selectSelectedCurrency)

  const amountCryptoPrecision = useMemo(
    () => fromBaseUnit(amountCryptoBaseUnit ?? 0, asset?.precision ?? 0),
    [amountCryptoBaseUnit, asset],
  )
  const dustAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(dustAmountCryptoBaseUnit ?? 0, asset?.precision ?? 0),
    [dustAmountCryptoBaseUnit, asset],
  )

  const { data: inboundAddressData } = useQuery({
    ...reactQueries.thornode.inboundAddresses(),
    staleTime: 60_000,
    select: data => selectInboundAddressData(data, assetId),
    enabled: !!assetId,
  })

  const estimateFeesArgs = useMemo(() => {
    if (!assetId || !feeAsset || !wallet || !asset) return undefined

    const amountCryptoBaseUnit = toBaseUnit(amountCryptoPrecision, asset.precision)

    // TODO(gomes): when consuming this in THORCHain savers, ensure we do not send dust amount instead of depositWithExpiry() Txs for EVM chains
    const dustAmountCryptoBaseUnit =
      THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT[feeAsset.assetId] ?? '0'
    const dustAmountCryptoPrecision = fromBaseUnit(dustAmountCryptoBaseUnit, feeAsset.precision)

    switch (transactionType) {
      case 'MsgDeposit': {
        return {
          amountCryptoPrecision: shouldUseDustAmount
            ? dustAmountCryptoPrecision
            : amountCryptoPrecision,
          assetId: asset.assetId,
          memo,
          to: THORCHAIN_POOL_MODULE_ADDRESS,
          sendMax: false,
          accountId,
          contractAddress: undefined,
        }
      }
      case 'EvmCustomTx': {
        if (!inboundAddressData?.router) return undefined
        if (!assetAddress) return undefined
        if (!memo) return undefined

        const amountOrDustCryptoBaseUnit = shouldUseDustAmount
          ? dustAmountCryptoBaseUnit
          : amountCryptoBaseUnit

        const data = depositWithExpiry({
          vault: getAddress(inboundAddressData.address),
          asset:
            // The asset param is a directive to initiate a transfer of said asset from the wallet to the contract
            // which is *not* what we want for withdrawals, see
            // https://www.tdly.co/shared/simulation/6d23d42a-8dd6-4e3e-88a8-62da779a765d
            isToken(fromAssetId(assetId).assetReference) && thorfiAction !== 'ThorchainLpExit'
              ? getAddress(fromAssetId(assetId).assetReference)
              : // THOR LP Native EVM asset deposits and THOR LP withdrawals (tokens/native assets) use the 0 address as the asset address
                // https://dev.thorchain.org/concepts/sending-transactions.html#admonition-info-1
                zeroAddress,
          amount: amountOrDustCryptoBaseUnit,
          memo,
          expiry: BigInt(dayjs().add(15, 'minute').unix()),
        })

        return {
          // amountCryptoPrecision is always denominated in fee asset - the only value we can send when calling a contract is native asset value
          // which happens for deposits (0-value) and withdrawals (dust-value, failure to send it means Txs won't be seen by THOR)
          amountCryptoPrecision:
            // TODO(gomes): this may not be applicable to other domains - verify the validity of this for others and adapt accordingly
            isToken(fromAssetId(assetId).assetReference) && thorfiAction === 'ThorchainLpEnter'
              ? '0'
              : fromBaseUnit(amountOrDustCryptoBaseUnit, feeAsset.precision),
          // Withdrawals do NOT occur a dust send to the contract address.
          // It's a regular 0-value contract-call
          // TODO(gomes): double check that this logic is correct across all domains, it is critical and getting things wrong here can lead to funds being lost
          assetId: thorfiAction === 'ThorchainLpExit' ? feeAsset.assetId : asset.assetId,
          to: inboundAddressData.router,
          from: assetAddress,
          sendMax: false,
          // This is an ERC-20, we abuse the memo field for the actual hex-encoded calldata
          memo: data,
          accountId,
          // Note, this is NOT a send.
          // contractAddress is only needed when doing a send and the account interacts *directly* with the token's contract address.
          // Here, the LP contract is approved beforehand to spend the token value, which it will when calling depositWithExpiry()
          contractAddress: undefined,
        }
      }
      case 'Send': {
        if (!inboundAddressData || !assetAddress) return undefined
        return {
          // TODO(gomes): When implementing this for savers, we will want to ensure that dust amount is only sent for non-UTXO chains
          // EVM chains should make use of depositWithExpiry() for withdrawals
          amountCryptoPrecision:
            thorfiAction === 'ThorchainLpExit' ? dustAmountCryptoPrecision : amountCryptoPrecision,
          assetId,
          to: inboundAddressData.address,
          from: assetAddress,
          sendMax: false,
          memo,
          accountId,
          contractAddress: undefined,
        }
      }
      default:
        return undefined
    }
  }, [
    accountId,
    amountCryptoPrecision,
    asset,
    assetAddress,
    assetId,
    feeAsset,
    inboundAddressData,
    memo,
    shouldUseDustAmount,
    thorfiAction,
    transactionType,
    wallet,
  ])

  const { data: estimatedFeesData } = useGetEstimatedFeesQuery({
    amountCryptoPrecision: estimateFeesArgs?.amountCryptoPrecision ?? '0',
    assetId: estimateFeesArgs?.assetId ?? '',
    to: estimateFeesArgs?.to ?? '',
    sendMax: estimateFeesArgs?.sendMax ?? false,
    memo: estimateFeesArgs?.memo ?? '',
    accountId: estimateFeesArgs?.accountId ?? '',
    contractAddress: estimateFeesArgs?.contractAddress ?? '',
    enabled: Boolean(estimateFeesArgs),
    disableRefetch: Boolean(txId || isSubmitting),
  })

  const onSignTx = useCallback(async () => {
    if (
      !(
        asset &&
        wallet &&
        accountNumber !== undefined &&
        (dustAmountCryptoBaseUnit || amountCryptoBaseUnit) &&
        transactionType &&
        (!isToken(fromAssetId(asset.assetId).assetReference) ||
          (isToken(fromAssetId(asset.assetId).assetReference) && inboundAddressData))
      )
    )
      return

    const { account } = fromAccountId(accountId)

    await (async () => {
      switch (transactionType) {
        case 'MsgDeposit': {
          if (!estimateFeesArgs) throw new Error('No estimateFeesArgs found')
          if (accountNumber === undefined) throw new Error(`No account number found`)
          if (!memo) return undefined

          const adapter = assertGetThorchainChainAdapter()
          const estimatedFees = await estimateFees(estimateFeesArgs)

          // LP deposit using THOR is a MsgDeposit tx
          const { txToSign } = await adapter.buildDepositTransaction({
            from: account,
            accountNumber,
            value: shouldUseDustAmount ? dustAmountCryptoBaseUnit! : amountCryptoBaseUnit!,
            memo,
            chainSpecific: {
              gas: (estimatedFees as FeeDataEstimate<KnownChainIds.ThorchainMainnet>).fast
                .chainSpecific.gasLimit,
              fee: (estimatedFees as FeeDataEstimate<KnownChainIds.ThorchainMainnet>).fast.txFee,
            },
          })
          const signedTx = await adapter.signTransaction({
            txToSign,
            wallet,
          })
          const _txId = await adapter.broadcastTransaction({
            senderAddress: account,
            receiverAddress: THORCHAIN_POOL_MODULE_ADDRESS,
            hex: signedTx,
          })
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
          setSerializedTxIndex(
            serializeTxIndex(accountId, _txId, account, { memo, parser: 'thorchain' }),
          )

          break
        }
        case 'EvmCustomTx': {
          if (!assetAddress) throw new Error('No account address found')
          if (!inboundAddressData?.address) throw new Error('No vault address found')
          if (!inboundAddressData?.router) throw new Error('No router address found')
          if (accountNumber === undefined) throw new Error('No account number found')
          if (!memo) return undefined

          const amountOrDustCryptoBaseUnit = shouldUseDustAmount
            ? dustAmountCryptoBaseUnit
            : amountCryptoBaseUnit

          if (!amountOrDustCryptoBaseUnit) throw new Error('Amount or dust amount is required')

          const data = depositWithExpiry({
            vault: getAddress(inboundAddressData.address),
            // The asset param is a directive to initiate a transfer of said asset from the wallet to the contract
            // which is *not* what we want for withdrawals, see
            // https://www.tdly.co/shared/simulation/6d23d42a-8dd6-4e3e-88a8-62da779a765d
            asset:
              isToken(fromAssetId(assetId).assetReference) && thorfiAction !== 'ThorchainLpExit'
                ? getAddress(fromAssetId(assetId).assetReference)
                : // Native EVM asset deposits and withdrawals (tokens/native assets) use the 0 address as the asset address
                  // https://dev.thorchain.org/concepts/sending-transactions.html#admonition-info-1
                  zeroAddress,
            amount: amountOrDustCryptoBaseUnit,
            memo,
            expiry: BigInt(dayjs().add(15, 'minute').unix()),
          })

          const adapter = assertGetEvmChainAdapter(asset.chainId)

          const buildCustomTxInput = await createBuildCustomTxInput({
            accountNumber,
            adapter,
            data,
            // value is always denominated in fee asset - the only value we can send when calling a contract is native asset value
            // which happens for deposits (0-value) and withdrawals (dust-value, failure to send it means Txs won't be seen by THOR)
            value:
              isToken(fromAssetId(assetId).assetReference) && thorfiAction !== 'ThorchainLpExit'
                ? '0'
                : amountOrDustCryptoBaseUnit,
            to: inboundAddressData.router,
            wallet,
          })

          const _txId = await buildAndBroadcast({
            adapter,
            buildCustomTxInput,
            receiverAddress: CONTRACT_INTERACTION, // no receiver for this contract call
          })
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
          setSerializedTxIndex(serializeTxIndex(accountId, _txId, assetAddress!))

          break
        }
        case 'Send': {
          if (!assetAddress) throw new Error('No account address found')
          if (!estimateFeesArgs) throw new Error('No estimateFeesArgs found')
          if (!inboundAddressData?.address) throw new Error('No vault address found')

          const estimatedFees = await estimateFees(estimateFeesArgs)
          const sendInput: SendInput = {
            amountCryptoPrecision: shouldUseDustAmount
              ? dustAmountCryptoPrecision
              : amountCryptoPrecision,
            assetId,
            to: inboundAddressData?.address,
            from: assetAddress,
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

          const txId = await handleSend({
            sendInput,
            wallet,
          })
          const _txIdLink = getTxLink({
            defaultExplorerBaseUrl: 'https://viewblock.io/thorchain/tx/',
            txId: txId ?? '',
            name: SwapperName.Thorchain,
          })
          toast({
            title: translate('modals.send.transactionSent'),
            description: txId ? (
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

          setTxId(txId)
          setSerializedTxIndex(serializeTxIndex(accountId, txId, fromAccountId(accountId).account))

          break
        }
        default:
          assertUnreachable(transactionType)
      }
    })()
  }, [
    asset,
    wallet,
    inboundAddressData,
    accountNumber,
    dustAmountCryptoBaseUnit,
    amountCryptoBaseUnit,
    accountId,
    transactionType,
    estimateFeesArgs,
    shouldUseDustAmount,
    memo,
    toast,
    translate,
    assetAddress,
    assetId,
    thorfiAction,
    dustAmountCryptoPrecision,
    amountCryptoPrecision,
    selectedCurrency,
  ])

  return { onSignTx, estimatedFeesData, txId, serializedTxIndex }
}
