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
import { fromBaseUnit, toBaseUnit } from 'lib/math'
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
  AsymSide,
  LpConfirmedDepositQuote,
  LpConfirmedWithdrawalQuote,
} from 'lib/utils/thorchain/lp/types'
import { isLpConfirmedDepositQuote } from 'lib/utils/thorchain/lp/utils'
import { depositWithExpiry } from 'lib/utils/thorchain/routerCalldata'
import { useGetEstimatedFeesQuery } from 'pages/Lending/hooks/useGetEstimatedFeesQuery'
import { getThorchainLpPosition } from 'pages/ThorChainLP/queries/queries'
import { THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectPortfolioAccountMetadataByAccountId,
  selectSelectedCurrency,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

type TransactionRowProps = {
  assetId?: AssetId
  poolAssetId?: AssetId
  amountCryptoPrecision: string
  onComplete: () => void
  isActive?: boolean
  isLast?: boolean
  confirmedQuote: LpConfirmedDepositQuote | LpConfirmedWithdrawalQuote
  asymSide?: AsymSide | null
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  assetId,
  poolAssetId,
  amountCryptoPrecision,
  onComplete,
  isActive,
  confirmedQuote,
  asymSide,
}) => {
  const queryClient = useQueryClient()
  const translate = useTranslate()
  const selectedCurrency = useAppSelector(selectSelectedCurrency)
  // TOOO(gomes): we may be able to handle this better, or not
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const isRuneTx = useMemo(() => asset?.assetId === thorchainAssetId, [asset?.assetId])
  const poolAsset = useAppSelector(state => selectAssetById(state, poolAssetId ?? ''))
  const [status, setStatus] = useState(TxStatus.Unknown)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)
  const wallet = useWallet().state.wallet
  const isDeposit = isLpConfirmedDepositQuote(confirmedQuote)

  const { currentAccountIdByChainId } = confirmedQuote

  const {
    isTradingActive,
    refetch: refetchIsTradingActive,
    isLoading: isTradingActiveLoading,
  } = useIsTradingActive({
    assetId: poolAssetId,
    enabled: !txId,
    swapperName: SwapperName.Thorchain,
  })

  const runeAccountId = currentAccountIdByChainId[thorchainChainId]
  const poolAssetAccountId =
    currentAccountIdByChainId[poolAsset?.assetId ? fromAssetId(poolAsset.assetId).chainId : '']
  const runeAccountNumberFilter = useMemo(
    () => ({ assetId: thorchainAssetId, accountId: runeAccountId ?? '' }),
    [runeAccountId],
  )

  const runeAccountNumber = useAppSelector(s =>
    selectAccountNumberByAccountId(s, runeAccountNumberFilter),
  )
  const assetAccountNumberFilter = useMemo(
    () => ({ assetId: asset?.assetId ?? '', accountId: poolAssetAccountId ?? '' }),
    [poolAssetAccountId, asset?.assetId],
  )

  const assetAccountNumber = useAppSelector(s =>
    selectAccountNumberByAccountId(s, assetAccountNumberFilter),
  )

  const assetAccountFilter = useMemo(
    () => ({ accountId: poolAssetAccountId }),
    [poolAssetAccountId],
  )
  const assetAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, assetAccountFilter),
  )
  const runeAccountFilter = useMemo(() => ({ accountId: runeAccountId }), [runeAccountId])
  const runeAccountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, runeAccountFilter),
  )

  const [accountAssetAddress, setAccountAssetAddress] = useState<string | null>(null)
  const [otherAssetAddress, setOtherAssetAddress] = useState<string | null>(null)

  useEffect(() => {
    if (!(wallet && asset && confirmedQuote?.opportunityId && assetAccountMetadata)) return
    const accountId = isRuneTx ? runeAccountId : poolAssetAccountId
    const otherAssetAccountId = isRuneTx ? poolAssetAccountId : runeAccountId
    const assetId = isRuneTx ? thorchainAssetId : poolAssetId
    const otherAssetAssetId = isRuneTx ? poolAssetId : thorchainAssetId
    const otherAssetAccountMetadata = isRuneTx ? assetAccountMetadata : runeAccountMetadata

    if (!assetId) return
    ;(async () => {
      const _accountAssetAddress = await getThorchainFromAddress({
        accountId,
        assetId,
        opportunityId: confirmedQuote.opportunityId,
        wallet,
        accountMetadata: assetAccountMetadata,
        getPosition: getThorchainLpPosition,
      })
      setAccountAssetAddress(_accountAssetAddress)

      // We don't want to set the other asset's address in the memo when doing asym deposits or we'll have bigly problems
      if (asymSide) return
      if (!otherAssetAccountId || !otherAssetAssetId || !otherAssetAccountMetadata) return

      const _otherAssetAddress = await getThorchainFromAddress({
        accountId: otherAssetAccountId,
        assetId: otherAssetAssetId,
        opportunityId: confirmedQuote.opportunityId,
        wallet,
        accountMetadata: otherAssetAccountMetadata,
        getPosition: getThorchainLpPosition,
      })
      setOtherAssetAddress(_otherAssetAddress.replace('bitcoincash:', ''))
    })()
  }, [
    assetAccountMetadata,
    asset,
    poolAssetAccountId,
    assetId,
    confirmedQuote.opportunityId,
    poolAssetId,
    runeAccountId,
    wallet,
    runeAccountMetadata,
    asymSide,
    isRuneTx,
  ])

  const [serializedTxIndex, setSerializedTxIndex] = useState<string>('')

  const tx = useAppSelector(gs => selectTxById(gs, serializedTxIndex))

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
          const shouldInvalidate = query.queryKey[0] === reactQueries.thorchainLp._def[0]
          return shouldInvalidate
        },
        type: 'all',
      })

      setStatus(TxStatus.Confirmed)
      return onComplete()
    },
  })

  useEffect(() => {
    if (!(txId && tx)) return

    if (tx?.status === TxStatus.Pending) {
      setStatus(tx.status)
      return
    }

    // Avoids this hook's mutate fn running too many times
    if (status === TxStatus.Confirmed) return

    if (tx?.status === TxStatus.Confirmed) {
      // The Tx is confirmed, but we still need to introspect completion from THOR itself
      // so we set the status as pending in the meantime
      setStatus(TxStatus.Pending)
      ;(async () => {
        await mutateAsync({ txId })
      })()
      return
    }
  }, [mutateAsync, onComplete, status, tx, txId])

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

  const estimateFeesArgs = useMemo(() => {
    if (!assetId || !wallet || !asset || !poolAsset) return undefined

    const thorchainNotationAssetId = assetIdToPoolAssetId({
      assetId: isRuneTx ? poolAsset.assetId : asset.assetId,
    })
    const transactionType = getThorchainLpTransactionType(asset.chainId)
    const amountCryptoBaseUnit = toBaseUnit(amountCryptoPrecision, asset.precision)

    switch (transactionType) {
      case 'MsgDeposit': {
        const memo = isDeposit
          ? `+:${thorchainNotationAssetId}:${otherAssetAddress ?? ''}:ss:${confirmedQuote.feeBps}`
          : `-:${thorchainNotationAssetId}:${confirmedQuote.withdrawalBps}`
        return {
          cryptoAmount: isDeposit ? amountCryptoPrecision : '0',
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
        const assetAddress = isToken(fromAssetId(assetId).assetReference)
          ? getAddress(fromAssetId(assetId).assetReference)
          : zeroAddress
        const amount = BigInt(toBaseUnit(amountCryptoPrecision, asset.precision).toString())

        const args = (() => {
          const expiry = BigInt(dayjs().add(15, 'minute').unix())
          const vault = getAddress(inboundAddressData.address)
          const asset = isToken(fromAssetId(assetId).assetReference)
            ? getAddress(fromAssetId(assetId).assetReference)
            : // Native EVM assets use the 0 address as the asset address
              // https://dev.thorchain.org/concepts/sending-transactions.html#admonition-info-1
              zeroAddress

          const memo = `+:${thorchainNotationAssetId}:${otherAssetAddress ?? ''}:ss:${
            confirmedQuote.feeBps
          }`
          const amount = BigInt(amountCryptoBaseUnit.toString())

          return { memo, amount, expiry, vault, asset }
        })()

        const data = depositWithExpiry({
          vault: args.vault,
          asset: args.asset,
          amount: args.amount,
          memo: args.memo,
          expiry: args.expiry,
        })

        return {
          cryptoAmount: amount.toString(),
          assetId: asset.assetId,
          to: inboundAddressData.router,
          from: accountAssetAddress,
          sendMax: false,
          // This is an ERC-20, we abuse the memo field for the actual hex-encoded calldata
          memo: data,
          accountId: poolAssetAccountId,
          contractAddress: assetAddress,
        }
      }
      case 'Send': {
        if (!inboundAddressData || !accountAssetAddress) return undefined
        const memo = isDeposit
          ? `+:${thorchainNotationAssetId}:${otherAssetAddress ?? ''}:ss:${confirmedQuote.feeBps}`
          : `-:${thorchainNotationAssetId}:${confirmedQuote.withdrawalBps}`

        return {
          cryptoAmount: isDeposit
            ? amountCryptoPrecision
            : // Reuse the savers util as a sane amount for the dust threshold
              fromBaseUnit(
                THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT[assetId],
                asset.precision,
              ) ?? '0',
          assetId,
          to: inboundAddressData.address,
          from: accountAssetAddress,
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
    assetId,
    wallet,
    asset,
    poolAsset,
    isRuneTx,
    amountCryptoPrecision,
    isDeposit,
    otherAssetAddress,
    confirmedQuote,
    runeAccountId,
    poolAssetAccountId,
    inboundAddressData,
    accountAssetAddress,
  ])

  const { data: estimatedFeesData, isLoading: isEstimatedFeesDataLoading } =
    useGetEstimatedFeesQuery({
      cryptoAmount: estimateFeesArgs?.cryptoAmount ?? '0',
      assetId: estimateFeesArgs?.assetId ?? '',
      to: estimateFeesArgs?.to ?? '',
      sendMax: estimateFeesArgs?.sendMax ?? false,
      memo: estimateFeesArgs?.memo ?? '',
      accountId: estimateFeesArgs?.accountId ?? '',
      contractAddress: estimateFeesArgs?.contractAddress ?? '',
      enabled: !!estimateFeesArgs && !txId,
    })

  const estimatedFeeDataCryptoPrecision = useMemo(() => {
    if (!estimatedFeesData || !asset) return undefined

    return fromBaseUnit(estimatedFeesData.txFeeCryptoBaseUnit, asset.precision)
  }, [asset, estimatedFeesData])

  const handleSignTx = useCallback(() => {
    setIsSubmitting(true)
    if (
      !(
        assetId &&
        poolAssetId &&
        asset &&
        poolAsset &&
        wallet &&
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
      // TODO(gomes): rename the utils to use the same terminology as well instead of the current poolAssetId one.
      // Left as-is for this PR to avoid a bigly diff
      const thorchainNotationAssetId = assetIdToPoolAssetId({
        assetId: isRuneTx ? poolAsset.assetId : asset.assetId,
      })
      const amountCryptoBaseUnit = toBaseUnit(amountCryptoPrecision, asset.precision)

      const transactionType = getThorchainLpTransactionType(asset.chainId)

      await (async () => {
        // We'll probably need to switch on chainNamespace instead here
        switch (transactionType) {
          case 'MsgDeposit': {
            if (runeAccountNumber === undefined) throw new Error(`No account number found for RUNE`)

            const adapter = assertGetThorchainChainAdapter()
            const memo = isDeposit
              ? `+:${thorchainNotationAssetId}:${otherAssetAddress ?? ''}:ss:${
                  confirmedQuote.feeBps
                }`
              : `-:${thorchainNotationAssetId}:${confirmedQuote.withdrawalBps}`

            const estimatedFees = await estimateFees({
              cryptoAmount: isDeposit ? amountCryptoPrecision : '0',
              assetId: asset.assetId,
              memo,
              to: THORCHAIN_POOL_MODULE_ADDRESS,
              sendMax: false,
              accountId,
              contractAddress: undefined,
            })

            // LP deposit using THOR is a MsgDeposit tx
            const { txToSign } = await adapter.buildDepositTransaction({
              from: account,
              accountNumber: runeAccountNumber,
              value: amountCryptoBaseUnit,
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

            setTxId(txId)
            setSerializedTxIndex(
              serializeTxIndex(runeAccountId, txId, account, { memo, parser: 'thorchain' }),
            )

            break
          }
          case 'EvmCustomTx': {
            if (!inboundAddressData?.router) return
            if (assetAccountNumber === undefined) return

            const args = (() => {
              const expiry = BigInt(dayjs().add(15, 'minute').unix())
              const vault = getAddress(inboundAddressData.address)
              const asset = isToken(fromAssetId(assetId).assetReference)
                ? getAddress(fromAssetId(assetId).assetReference)
                : // Native EVM assets use the 0 address as the asset address
                  // https://dev.thorchain.org/concepts/sending-transactions.html#admonition-info-1
                  zeroAddress

              const memo = `+:${thorchainNotationAssetId}:${otherAssetAddress ?? ''}:ss:${
                confirmedQuote.feeBps
              }`
              const amount = BigInt(amountCryptoBaseUnit.toString())

              return { memo, amount, expiry, vault, asset }
            })()

            const data = depositWithExpiry({
              vault: args.vault,
              asset: args.asset,
              amount: args.amount,
              memo: args.memo,
              expiry: args.expiry,
            })

            const adapter = assertGetEvmChainAdapter(asset.chainId)

            const buildCustomTxInput = await createBuildCustomTxInput({
              accountNumber: assetAccountNumber,
              adapter,
              data,
              value: isToken(fromAssetId(assetId).assetReference)
                ? '0'
                : amountCryptoBaseUnit.toString(),
              to: inboundAddressData.router,
              wallet,
            })

            const txid = await buildAndBroadcast({
              adapter,
              buildCustomTxInput,
              receiverAddress: CONTRACT_INTERACTION, // no receiver for this contract call
            })

            setTxId(txid)
            setSerializedTxIndex(serializeTxIndex(poolAssetAccountId, txid, accountAssetAddress!))

            break
          }
          case 'Send': {
            if (!inboundAddressData) throw new Error('No inboundAddressData found')
            // ATOM/RUNE/ UTXOs- obviously make me a switch case for things to be cleaner
            if (!accountAssetAddress) throw new Error('No accountAddress found')

            const memo = isDeposit
              ? `+:${thorchainNotationAssetId}:${otherAssetAddress ?? ''}:ss:${
                  confirmedQuote.feeBps
                }`
              : `-:${thorchainNotationAssetId}:${confirmedQuote.withdrawalBps}`

            const estimateFeesArgs = {
              cryptoAmount: isDeposit
                ? amountCryptoPrecision
                : // Reuse the savers util as a sane amount for the dust threshold
                  fromBaseUnit(
                    THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT[assetId],
                    asset.precision,
                  ) ?? '0',
              assetId,
              to: inboundAddressData?.address,
              from: accountAssetAddress,
              sendMax: false,
              memo,
              accountId,
              contractAddress: undefined,
            }
            const estimatedFees = await estimateFees(estimateFeesArgs)
            const sendInput: SendInput = {
              cryptoAmount: isDeposit
                ? amountCryptoPrecision
                : // Reuse the savers util as a sane amount for the dust threshold
                  fromBaseUnit(
                    THORCHAIN_SAVERS_DUST_THRESHOLDS_CRYPTO_BASE_UNIT[assetId],
                    asset.precision,
                  ) ?? '0',
              assetId,
              to: inboundAddressData?.address,
              from: accountAssetAddress,
              sendMax: false,
              accountId,
              memo,
              amountFieldError: '',
              estimatedFees,
              feeType: FeeDataKey.Fast,
              fiatAmount: '',
              fiatSymbol: selectedCurrency,
              vanityAddress: '',
              input: inboundAddressData?.address,
            }

            const txId = await handleSend({
              sendInput,
              wallet,
            })

            setTxId(txId)
            setSerializedTxIndex(serializeTxIndex(poolAssetAccountId, txId, accountAssetAddress!))

            break
          }
          default:
            assertUnreachable(transactionType)
        }
      })()
    })().then(() => {
      setStatus(TxStatus.Pending)
      setIsSubmitting(false)
    })
  }, [
    assetId,
    poolAssetId,
    asset,
    poolAsset,
    wallet,
    isRuneTx,
    inboundAddressData,
    refetchIsTradingActive,
    runeAccountId,
    poolAssetAccountId,
    amountCryptoPrecision,
    runeAccountNumber,
    isDeposit,
    otherAssetAddress,
    confirmedQuote,
    assetAccountNumber,
    accountAssetAddress,
    selectedCurrency,
  ])

  const txIdLink = useMemo(() => `${asset?.explorerTxLink}${txId}`, [asset?.explorerTxLink, txId])

  const confirmTranslation = useMemo(() => {
    if (isTradingActive === false) return translate('common.poolHalted')

    return translate('common.signTransaction')
  }, [isTradingActive, translate])

  if (!asset) return null

  return (
    <Card>
      <CardHeader gap={2} display='flex' flexDir='row' alignItems='center'>
        <AssetIcon size='xs' assetId={asset.assetId} />
        <Amount.Crypto fontWeight='bold' value={amountCryptoPrecision} symbol={asset.symbol} />{' '}
        <Flex ml='auto' alignItems='center' gap={2}>
          {txId && (
            <Button as={Link} isExternal href={txIdLink} size='xs'>
              {translate('common.seeDetails')}
            </Button>
          )}
          {status === TxStatus.Confirmed ? (
            <>
              <Center
                bg='background.success'
                boxSize='24px'
                borderRadius='full'
                color='text.success'
                fontSize='xs'
              >
                <FaCheck />
              </Center>
            </>
          ) : (
            <CircularProgress isIndeterminate={status === TxStatus.Pending} size='24px' />
          )}
        </Flex>
      </CardHeader>
      <Collapse in={isActive}>
        <CardBody display='flex' flexDir='column' gap={2}>
          <Row fontSize='sm'>
            <Row.Label>{translate('common.gasFee')}</Row.Label>
            <Row.Value>
              <Skeleton isLoaded={Boolean(!isEstimatedFeesDataLoading && estimatedFeesData)}>
                <Amount.Crypto
                  value={estimatedFeeDataCryptoPrecision ?? '0'}
                  symbol={asset.symbol}
                />
              </Skeleton>
            </Row.Value>
          </Row>
          <Button
            mx={-2}
            size='lg'
            colorScheme={isTradingActive === false ? 'red' : 'blue'}
            onClick={handleSignTx}
            isDisabled={isTradingActive === false}
            isLoading={
              status === TxStatus.Pending ||
              isInboundAddressLoading ||
              isTradingActiveLoading ||
              isEstimatedFeesDataLoading ||
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
