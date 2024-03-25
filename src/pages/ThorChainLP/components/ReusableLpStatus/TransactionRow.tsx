import { ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Center,
  Collapse,
  Flex,
  Link,
  Skeleton,
  Text,
  useToast,
} from '@chakra-ui/react'
import {
  type AssetId,
  fromAccountId,
  fromAssetId,
  thorchainAssetId,
  thorchainChainId,
} from '@shapeshiftoss/caip'
import {
  CONTRACT_INTERACTION,
  type FeeDataEstimate,
  FeeDataKey,
} from '@shapeshiftoss/chain-adapters'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaCheck } from 'react-icons/fa'
import { FaX } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useIsTradingActive } from 'react-queries/hooks/useIsTradingActive'
import { selectInboundAddressData } from 'react-queries/selectors'
import { getAddress, zeroAddress } from 'viem'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import type { SendInput } from 'components/Modals/Send/Form'
import { estimateFees, handleSend } from 'components/Modals/Send/utils'
import { Row } from 'components/Row/Row'
import { useWallet } from 'hooks/useWallet/useWallet'
import { getTxLink } from 'lib/getTxLink'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { sleep } from 'lib/poll/poll'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { assertUnreachable, isToken } from 'lib/utils'
import { assertGetThorchainChainAdapter } from 'lib/utils/cosmosSdk'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
} from 'lib/utils/evm'
import { getThorchainFromAddress, waitForThorchainUpdate } from 'lib/utils/thorchain'
import { THORCHAIN_POOL_MODULE_ADDRESS } from 'lib/utils/thorchain/constants'
import { getThorchainLpTransactionType } from 'lib/utils/thorchain/lp'
import type {
  LpConfirmedDepositQuote,
  LpConfirmedWithdrawalQuote,
} from 'lib/utils/thorchain/lp/types'
import {
  isLpConfirmedDepositQuote,
  isLpConfirmedWithdrawalQuote,
} from 'lib/utils/thorchain/lp/utils'
import { depositWithExpiry } from 'lib/utils/thorchain/routerCalldata'
import { useGetEstimatedFeesQuery } from 'pages/Lending/hooks/useGetEstimatedFeesQuery'
import { getThorchainLpPosition } from 'pages/ThorChainLP/queries/queries'
import type { OpportunityType } from 'pages/ThorChainLP/utils'
import { THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectFeeAssetByChainId,
  selectPortfolioAccountMetadataByAccountId,
  selectSelectedCurrency,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

type TransactionRowProps = {
  assetId: AssetId
  poolAssetId: AssetId
  amountCryptoPrecision: string
  onComplete: (status: TxStatus) => void
  onStart: () => void
  isActive?: boolean
  isLast?: boolean
  confirmedQuote: LpConfirmedDepositQuote | LpConfirmedWithdrawalQuote
  opportunityType: OpportunityType
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  assetId,
  poolAssetId,
  amountCryptoPrecision,
  onComplete,
  onStart,
  isActive,
  confirmedQuote,
  opportunityType,
}) => {
  const toast = useToast()
  const queryClient = useQueryClient()
  const translate = useTranslate()
  const selectedCurrency = useAppSelector(selectSelectedCurrency)
  const wallet = useWallet().state.wallet
  const mixpanel = getMixPanel()

  const [status, setStatus] = useState(TxStatus.Unknown)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)
  const [txFeeCryptoPrecision, setTxFeeCryptoPrecision] = useState<string | undefined>()
  const [assetAddress, setAssetAddress] = useState<string | null>(null)
  const [pairAssetAddress, setPairAssetAddress] = useState<string | null>(null)

  const { currentAccountIdByChainId, positionStatus } = confirmedQuote

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(assetId).chainId),
  )

  const poolAsset = useAppSelector(state => selectAssetById(state, poolAssetId))
  const poolAssetAccountId = currentAccountIdByChainId[fromAssetId(poolAssetId).chainId]
  const poolAssetAccountNumberFilter = useMemo(
    () => ({ assetId: poolAssetId, accountId: poolAssetAccountId }),
    [poolAssetAccountId, poolAssetId],
  )
  const poolAssetAccountNumber = useAppSelector(s =>
    selectAccountNumberByAccountId(s, poolAssetAccountNumberFilter),
  )
  const poolAssetAccountFilter = useMemo(
    () => ({ accountId: poolAssetAccountId }),
    [poolAssetAccountId],
  )
  const poolAssetAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, poolAssetAccountFilter),
  )

  const runeAccountId = currentAccountIdByChainId[thorchainChainId]
  const runeAccountNumberFilter = useMemo(
    () => ({ assetId: thorchainAssetId, accountId: runeAccountId }),
    [runeAccountId],
  )
  const runeAccountNumber = useAppSelector(s =>
    selectAccountNumberByAccountId(s, runeAccountNumberFilter),
  )
  const runeAccountFilter = useMemo(() => ({ accountId: runeAccountId }), [runeAccountId])
  const runeAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, runeAccountFilter),
  )

  const isRuneTx = useMemo(() => assetId === thorchainAssetId, [assetId])
  const isDeposit = isLpConfirmedDepositQuote(confirmedQuote)
  const isSymWithdraw = isLpConfirmedWithdrawalQuote(confirmedQuote) && opportunityType === 'sym'

  const {
    isTradingActive,
    refetch: refetchIsTradingActive,
    isLoading: isTradingActiveLoading,
  } = useIsTradingActive({
    assetId: poolAssetId,
    enabled: !txId,
    swapperName: SwapperName.Thorchain,
  })

  useEffect(() => {
    if (!wallet) return

    const accountId = isRuneTx ? runeAccountId : poolAssetAccountId
    const assetId = isRuneTx ? thorchainAssetId : poolAssetId
    const accountMetadata = isRuneTx ? runeAccountMetadata : poolAssetAccountMetadata

    const pairAssetAssetId = isRuneTx ? poolAssetId : thorchainAssetId
    const pairAssetAccountId = isRuneTx ? poolAssetAccountId : runeAccountId
    const pairAssetAccountMetadata = isRuneTx ? poolAssetAccountMetadata : runeAccountMetadata

    if (!accountMetadata) return
    ;(async () => {
      const _assetAddress = await getThorchainFromAddress({
        accountId,
        assetId,
        opportunityId: confirmedQuote.opportunityId,
        wallet,
        accountMetadata,
        getPosition: getThorchainLpPosition,
      })

      // use address as is for use in constructing the transaction (not related to memo)
      setAssetAddress(_assetAddress)

      // We don't want to set the other asset's address in the memo when doing asym deposits or we'll have bigly problems
      if (opportunityType !== 'sym') return
      if (!pairAssetAccountMetadata) return

      const _pairAssetAddress = await getThorchainFromAddress({
        accountId: pairAssetAccountId,
        assetId: pairAssetAssetId,
        opportunityId: confirmedQuote.opportunityId,
        wallet,
        accountMetadata: pairAssetAccountMetadata,
        getPosition: getThorchainLpPosition,
      })

      // strip bech32 prefix for use in thorchain memo (bech32 not supported)
      setPairAssetAddress(_pairAssetAddress.replace('bitcoincash:', ''))
    })()
  }, [
    assetId,
    opportunityType,
    confirmedQuote.opportunityId,
    isRuneTx,
    poolAssetAccountId,
    poolAssetAccountMetadata,
    poolAssetId,
    runeAccountId,
    runeAccountMetadata,
    wallet,
  ])

  const [serializedTxIndex, setSerializedTxIndex] = useState<string>('')

  const tx = useAppSelector(state => selectTxById(state, serializedTxIndex))

  const { mutateAsync } = useMutation({
    mutationKey: [txId],
    mutationFn: ({ txId: _txId }: { txId: string }) => {
      return waitForThorchainUpdate({
        txId: _txId,
        skipOutbound: true, // this is an LP Tx, there is no outbound
      }).promise
    },
    onSuccess: async () => {
      // More paranoia to ensure everything is nice and propagated - this works with debugger but doesn't without it,
      // indicating we need a bit more of artificial wait to ensure data is replicated across all endpoints
      await sleep(60_000)
      // Awaiting here for paranoia since this will actually refresh vs. using the sync version
      await queryClient.invalidateQueries({
        predicate: query => {
          // Paranoia using a predicate vs. a queryKey here, to ensure queries *actually* get invalidated
          const shouldInvalidate = query.queryKey?.[0] === reactQueries.thorchainLp._def[0]
          return shouldInvalidate
        },
        type: 'all',
      })

      setStatus(TxStatus.Confirmed)
      onComplete(TxStatus.Confirmed)
      setIsSubmitting(false)
    },
  })

  // manages incomplete sym deposits by setting the already confirmed transaction as complete
  useEffect(() => {
    if (isLpConfirmedWithdrawalQuote(confirmedQuote)) return
    if (status !== TxStatus.Unknown) return
    if (!positionStatus?.incomplete) return
    if (positionStatus.incomplete.asset.assetId === assetId) return

    setStatus(TxStatus.Confirmed)
    onComplete(TxStatus.Confirmed)
  }, [assetId, confirmedQuote, onComplete, positionStatus?.incomplete, status])

  useEffect(() => {
    if (!txId) return

    // Return if the status has been set to confirmed or failed
    // - Confirmed means we got a successful status from thorchain and should not trigger the mutation again
    // - Failed means the inbound transaction failed and there is no reason to trigger the mutation as it will never be picked up by thorchain
    if (status === TxStatus.Confirmed || status === TxStatus.Failed) return

    // Consider rune transactions pending after broadcast and start polling thorchain right away
    if (isRuneTx) {
      if (status === TxStatus.Unknown) {
        setStatus(TxStatus.Pending)
        ;(async () => await mutateAsync({ txId }))()
      }
      return
    }

    if (!tx) return

    // Track pending status
    if (tx.status === TxStatus.Pending) {
      setStatus(tx.status)
      return
    }

    // Track failed status, reset isSubmitting (tx failed and won't be picked up by thorchain), and handle onComplete
    if (tx.status === TxStatus.Failed) {
      setStatus(tx.status)
      onComplete(TxStatus.Failed)
      setIsSubmitting(false)
      return
    }

    if (tx.status === TxStatus.Confirmed) {
      ;(async () => await mutateAsync({ txId }))()
    }
  }, [mutateAsync, status, tx, txId, isRuneTx, onComplete])

  const { data: inboundAddressData, isLoading: isInboundAddressLoading } = useQuery({
    ...reactQueries.thornode.inboundAddresses(),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    // We technically don't care about going stale immediately here - halted checks are done JIT at signing time in case the pool went
    // halted by the time the user clicked the confirm button
    // But we still have some sane 60s stale time rather than 0 for paranoia's sake, as a balance of safety and not overfetching
    staleTime: 60_000,
    select: data => selectInboundAddressData(data, assetId),
    enabled: !!assetId,
  })

  const thorchainNotationAssetId = useMemo(() => {
    // TODO(gomes): rename the utils to use the same terminology as well instead of the current poolAssetId one.
    // Left as-is for this PR to avoid a bigly diff
    return assetIdToPoolAssetId({ assetId: poolAssetId })
  }, [poolAssetId])

  const memo = useMemo(() => {
    if (thorchainNotationAssetId === undefined) return
    if (opportunityType === 'sym' && !pairAssetAddress) return

    return isDeposit
      ? `+:${thorchainNotationAssetId}:${pairAssetAddress ?? ''}:ss:${confirmedQuote.feeBps}`
      : `-:${thorchainNotationAssetId}:${confirmedQuote.withdrawalBps}`
  }, [isDeposit, thorchainNotationAssetId, pairAssetAddress, confirmedQuote, opportunityType])

  const estimateFeesArgs = useMemo(() => {
    if (!assetId || !wallet || !asset || !poolAsset || !memo || !feeAsset) return undefined

    const amountCryptoBaseUnit = toBaseUnit(amountCryptoPrecision, asset.precision)
    const dustAmountCryptoBaseUnit =
      THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT[feeAsset.assetId] ?? '0'
    const dustAmountCryptoPrecision = fromBaseUnit(dustAmountCryptoBaseUnit, feeAsset.precision)

    const transactionType = getThorchainLpTransactionType(asset.chainId)

    switch (transactionType) {
      case 'MsgDeposit': {
        return {
          amountCryptoPrecision: isDeposit ? amountCryptoPrecision : dustAmountCryptoPrecision,
          assetId: asset.assetId,
          memo,
          to: THORCHAIN_POOL_MODULE_ADDRESS,
          sendMax: false,
          accountId: isRuneTx ? runeAccountId : poolAssetAccountId,
          contractAddress: undefined,
        }
      }
      case 'EvmCustomTx': {
        if (!inboundAddressData?.router) return undefined
        if (!assetAddress) return undefined

        const amountOrDustCryptoBaseUnit = isDeposit
          ? amountCryptoBaseUnit
          : dustAmountCryptoBaseUnit

        const data = depositWithExpiry({
          vault: getAddress(inboundAddressData.address),
          asset:
            // The asset param is a directive to initiate a transfer of said asset from the wallet to the contract
            // which is *not* what we want for withdrawals, see
            // https://www.tdly.co/shared/simulation/6d23d42a-8dd6-4e3e-88a8-62da779a765d
            isToken(fromAssetId(assetId).assetReference) && isDeposit
              ? getAddress(fromAssetId(assetId).assetReference)
              : // Native EVM asset deposits and withdrawals (tokens/native assets) use the 0 address as the asset address
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
            isToken(fromAssetId(assetId).assetReference) && isDeposit
              ? '0'
              : fromBaseUnit(amountOrDustCryptoBaseUnit, feeAsset.precision),
          // Withdrawals do NOT occur a dust send to the contract address.
          // It's a regular 0-value contract-call
          assetId: isDeposit ? asset.assetId : feeAsset.assetId,
          to: inboundAddressData.router,
          from: assetAddress,
          sendMax: false,
          // This is an ERC-20, we abuse the memo field for the actual hex-encoded calldata
          memo: data,
          accountId: poolAssetAccountId,
          // Note, this is NOT a send.
          // contractAddress is only needed when doing a send and the account interacts *directly* with the token's contract address.
          // Here, the LP contract is approved beforehand to spend the token value, which it will when calling depositWithExpiry()
          contractAddress: undefined,
        }
      }
      case 'Send': {
        if (!inboundAddressData || !assetAddress) return undefined
        return {
          amountCryptoPrecision: isDeposit ? amountCryptoPrecision : dustAmountCryptoPrecision,
          assetId,
          to: inboundAddressData.address,
          from: assetAddress,
          sendMax: false,
          memo,
          accountId: poolAssetAccountId,
          contractAddress: undefined,
        }
      }
      default:
        return undefined
    }
  }, [
    amountCryptoPrecision,
    asset,
    assetAddress,
    assetId,
    feeAsset,
    inboundAddressData,
    isDeposit,
    isRuneTx,
    memo,
    poolAsset,
    poolAssetAccountId,
    runeAccountId,
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

  useEffect(() => {
    if (!estimatedFeesData || !feeAsset) return
    if (txId || isSubmitting) return

    setTxFeeCryptoPrecision(
      fromBaseUnit(estimatedFeesData.txFeeCryptoBaseUnit, feeAsset?.precision),
    )
  }, [estimatedFeesData, feeAsset, isSubmitting, txId])

  const txIdLink = useMemo(
    () =>
      getTxLink({
        defaultExplorerBaseUrl: 'https://viewblock.io/thorchain/tx/',
        txId: txId ?? '',
        name: SwapperName.Thorchain,
      }),
    [txId],
  )

  const handleSignTx = useCallback(() => {
    setIsSubmitting(true)
    mixpanel?.track(
      isDeposit ? MixPanelEvent.LpDepositInitiated : MixPanelEvent.LpWithdrawInitiated,
      confirmedQuote,
    )
    if (
      !(
        assetId &&
        poolAssetId &&
        asset &&
        feeAsset &&
        poolAsset &&
        wallet &&
        memo &&
        (isRuneTx || inboundAddressData?.address)
      )
    ) {
      setIsSubmitting(false)
      return
    }

    return (async () => {
      // Pool just became halted at signing component mount, it's definitely not going to go back to active in just
      // the few seconds it takes to go from mount to sign click
      const _isTradingActive = await refetchIsTradingActive()
      if (!_isTradingActive) throw new Error('Pool Halted')

      const accountId = isRuneTx ? runeAccountId : poolAssetAccountId
      if (!accountId) throw new Error(`No accountId found for asset ${asset.assetId}`)
      const { account } = fromAccountId(accountId)

      const amountCryptoBaseUnit = toBaseUnit(amountCryptoPrecision, asset.precision)
      const dustAmountCryptoBaseUnit =
        THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT[feeAsset.assetId] ?? '0'
      const dustAmountCryptoPrecision = fromBaseUnit(dustAmountCryptoBaseUnit, feeAsset.precision)

      const transactionType = getThorchainLpTransactionType(asset.chainId)

      await (async () => {
        // We'll probably need to switch on chainNamespace instead here
        switch (transactionType) {
          case 'MsgDeposit': {
            if (!estimateFeesArgs) throw new Error('No estimateFeesArgs found')
            if (runeAccountNumber === undefined) throw new Error(`No account number found`)

            const adapter = assertGetThorchainChainAdapter()
            const estimatedFees = await estimateFees(estimateFeesArgs)

            // LP deposit using THOR is a MsgDeposit tx
            const { txToSign } = await adapter.buildDepositTransaction({
              from: account,
              accountNumber: runeAccountNumber,
              value: isDeposit ? amountCryptoBaseUnit : dustAmountCryptoBaseUnit,
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
            const txId = await adapter.broadcastTransaction({
              senderAddress: account,
              receiverAddress: THORCHAIN_POOL_MODULE_ADDRESS,
              hex: signedTx,
            })
            const _txIdLink = getTxLink({
              defaultExplorerBaseUrl: 'https://viewblock.io/thorchain/tx/',
              txId: txId ?? '',
              name: SwapperName.Thorchain,
            })

            toast({
              title: translate('modals.send.transactionSent'),
              description: (
                <Text>
                  <Link href={_txIdLink} isExternal>
                    {translate('modals.status.viewExplorer')} <ExternalLinkIcon mx='2px' />
                  </Link>
                </Text>
              ),
              status: 'success',
              duration: 9000,
              isClosable: true,
              position: 'top-right',
            })

            setTxId(txId)
            setSerializedTxIndex(
              serializeTxIndex(runeAccountId, txId, account, { memo, parser: 'thorchain' }),
            )

            break
          }
          case 'EvmCustomTx': {
            if (!assetAddress) throw new Error('No account address found')
            if (!inboundAddressData?.address) throw new Error('No vault address found')
            if (!inboundAddressData?.router) throw new Error('No router address found')
            if (poolAssetAccountNumber === undefined) throw new Error('No account number found')

            const amountOrDustCryptoBaseUnit = isDeposit
              ? amountCryptoBaseUnit
              : dustAmountCryptoBaseUnit

            const data = depositWithExpiry({
              vault: getAddress(inboundAddressData.address),
              // The asset param is a directive to initiate a transfer of said asset from the wallet to the contract
              // which is *not* what we want for withdrawals, see
              // https://www.tdly.co/shared/simulation/6d23d42a-8dd6-4e3e-88a8-62da779a765d
              asset:
                isToken(fromAssetId(assetId).assetReference) && isDeposit
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
              accountNumber: poolAssetAccountNumber,
              adapter,
              data,
              // value is always denominated in fee asset - the only value we can send when calling a contract is native asset value
              // which happens for deposits (0-value) and withdrawals (dust-value, failure to send it means Txs won't be seen by THOR)
              value:
                isToken(fromAssetId(assetId).assetReference) && isDeposit
                  ? '0'
                  : amountOrDustCryptoBaseUnit,
              to: inboundAddressData.router,
              wallet,
            })

            const txid = await buildAndBroadcast({
              adapter,
              buildCustomTxInput,
              receiverAddress: CONTRACT_INTERACTION, // no receiver for this contract call
            })
            const _txIdLink = getTxLink({
              defaultExplorerBaseUrl: 'https://viewblock.io/thorchain/tx/',
              txId: txId ?? '',
              name: SwapperName.Thorchain,
            })
            toast({
              title: translate('modals.send.transactionSent'),
              description: (
                <Text>
                  <Link href={_txIdLink} isExternal>
                    {translate('modals.status.viewExplorer')} <ExternalLinkIcon mx='2px' />
                  </Link>
                </Text>
              ),
              status: 'success',
              duration: 9000,
              isClosable: true,
              position: 'top-right',
            })

            setTxId(txid)
            setSerializedTxIndex(serializeTxIndex(poolAssetAccountId, txid, assetAddress!))

            break
          }
          case 'Send': {
            if (!assetAddress) throw new Error('No account address found')
            if (!estimateFeesArgs) throw new Error('No estimateFeesArgs found')
            if (!inboundAddressData?.address) throw new Error('No vault address found')

            const estimatedFees = await estimateFees(estimateFeesArgs)
            const sendInput: SendInput = {
              amountCryptoPrecision: isDeposit ? amountCryptoPrecision : dustAmountCryptoPrecision,
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
              description: (
                <Text>
                  <Link href={_txIdLink} isExternal>
                    {translate('modals.status.viewExplorer')} <ExternalLinkIcon mx='2px' />
                  </Link>
                </Text>
              ),
              status: 'success',
              duration: 9000,
              isClosable: true,
              position: 'top-right',
            })

            setTxId(txId)
            setSerializedTxIndex(
              serializeTxIndex(poolAssetAccountId, txId, fromAccountId(poolAssetAccountId).account),
            )

            break
          }
          default:
            assertUnreachable(transactionType)
        }
      })()
    })().then(() => {
      onStart()
    })
  }, [
    mixpanel,
    isDeposit,
    confirmedQuote,
    assetId,
    poolAssetId,
    asset,
    feeAsset,
    poolAsset,
    wallet,
    memo,
    isRuneTx,
    inboundAddressData?.address,
    inboundAddressData?.router,
    refetchIsTradingActive,
    runeAccountId,
    poolAssetAccountId,
    amountCryptoPrecision,
    estimateFeesArgs,
    runeAccountNumber,
    toast,
    translate,
    assetAddress,
    poolAssetAccountNumber,
    txId,
    selectedCurrency,
    onStart,
  ])

  const confirmTranslation = useMemo(() => {
    if (isTradingActive === false) return translate('common.poolHalted')
    if (status === TxStatus.Failed) return translate('common.transactionFailed')

    return translate('common.signTransaction')
  }, [isTradingActive, translate, status])

  const txStatusIndicator = useMemo(() => {
    if (status === TxStatus.Confirmed) {
      return (
        <Center
          bg='background.success'
          boxSize='24px'
          borderRadius='full'
          color='text.success'
          fontSize='xs'
        >
          <FaCheck />
        </Center>
      )
    }

    if (status === TxStatus.Failed) {
      return (
        <Center
          bg='background.error'
          boxSize='24px'
          borderRadius='full'
          color='text.error'
          fontSize='xs'
        >
          <FaX />
        </Center>
      )
    }

    return <CircularProgress isIndeterminate={status === TxStatus.Pending} size='24px' />
  }, [status])

  if (!asset || !feeAsset) return null

  return (
    <Card>
      <CardHeader gap={2} display='flex' flexDir='row' alignItems='center'>
        <AssetIcon size='xs' assetId={asset.assetId} />
        <Amount.Crypto fontWeight='bold' value={amountCryptoPrecision} symbol={asset.symbol} />{' '}
        {isSymWithdraw && (
          // Symmetrical withdrawals withdraw both asset amounts in a single TX.
          // In this case, we want to show the pool asset amount in additional to the rune amount for the user
          <>
            <AssetIcon size='xs' assetId={poolAsset?.assetId} />
            <Amount.Crypto
              fontWeight='bold'
              value={confirmedQuote.assetWithdrawAmountCryptoPrecision}
              symbol={poolAsset?.symbol ?? ''}
            />{' '}
          </>
        )}
        <Flex ml='auto' alignItems='center' gap={2}>
          {txId && (
            <Button as={Link} isExternal href={txIdLink} size='xs'>
              {translate('common.seeDetails')}
            </Button>
          )}
          {txStatusIndicator}
        </Flex>
      </CardHeader>
      <Collapse in={isActive}>
        <CardBody display='flex' flexDir='column' gap={2}>
          <Row fontSize='sm'>
            <Row.Label>{translate('common.gasFee')}</Row.Label>
            <Row.Value>
              <Skeleton isLoaded={Boolean(txFeeCryptoPrecision)}>
                <Amount.Crypto value={txFeeCryptoPrecision ?? '0'} symbol={feeAsset.symbol} />
              </Skeleton>
            </Row.Value>
          </Row>
          <Button
            mx={-2}
            size='lg'
            colorScheme={isTradingActive === false || status === TxStatus.Failed ? 'red' : 'blue'}
            onClick={handleSignTx}
            isDisabled={isTradingActive === false || status === TxStatus.Failed}
            isLoading={
              isInboundAddressLoading ||
              isTradingActiveLoading ||
              !Boolean(txFeeCryptoPrecision) ||
              isSubmitting
            }
          >
            {confirmTranslation}
          </Button>
        </CardBody>
      </Collapse>
    </Card>
  )
}
