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
import { getTxLink } from 'lib/getTxLink'
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
  selectFeeAssetByChainId,
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
  poolAmountCryptoPrecision: string | undefined
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
  poolAmountCryptoPrecision,
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
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, asset?.chainId ?? ''))
  const isRuneTx = useMemo(() => asset?.assetId === thorchainAssetId, [asset?.assetId])
  const poolAsset = useAppSelector(state => selectAssetById(state, poolAssetId ?? ''))
  const [status, setStatus] = useState(TxStatus.Unknown)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)
  const wallet = useWallet().state.wallet
  const isDeposit = isLpConfirmedDepositQuote(confirmedQuote)
  const isSymWithdraw = poolAmountCryptoPrecision !== undefined

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
          const shouldInvalidate = query.queryKey?.[0] === reactQueries.thorchainLp._def[0]
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

  const thorchainNotationAssetId = useMemo(() => {
    if (!asset || !poolAsset) return undefined
    // TODO(gomes): rename the utils to use the same terminology as well instead of the current poolAssetId one.
    // Left as-is for this PR to avoid a bigly diff
    return assetIdToPoolAssetId({
      assetId: isRuneTx ? poolAsset.assetId : asset.assetId,
    })
  }, [asset, poolAsset, isRuneTx])

  const memo = useMemo(() => {
    if (thorchainNotationAssetId === undefined) return undefined
    return isDeposit
      ? `+:${thorchainNotationAssetId}:${otherAssetAddress ?? ''}:ss:${confirmedQuote.feeBps}`
      : `-:${thorchainNotationAssetId}:${confirmedQuote.withdrawalBps}`
  }, [isDeposit, thorchainNotationAssetId, otherAssetAddress, confirmedQuote])

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
        if (!accountAssetAddress) return undefined

        const amountOrDustCryptoBaseUnit = isDeposit
          ? amountCryptoBaseUnit
          : dustAmountCryptoBaseUnit

        const data = depositWithExpiry({
          vault: getAddress(inboundAddressData.address),
          asset: isToken(fromAssetId(assetId).assetReference)
            ? getAddress(fromAssetId(assetId).assetReference)
            : // Native EVM assets use the 0 address as the asset address
              // https://dev.thorchain.org/concepts/sending-transactions.html#admonition-info-1
              zeroAddress,
          amount: amountOrDustCryptoBaseUnit,
          memo,
          expiry: BigInt(dayjs().add(15, 'minute').unix()),
        })

        return {
          // amountCryptoPrecision is always denominated in fee asset - the only value we can send when calling a contract is native asset value
          amountCryptoPrecision: isToken(fromAssetId(assetId).assetReference)
            ? '0'
            : fromBaseUnit(amountOrDustCryptoBaseUnit, feeAsset.precision),
          // Withdraws do NOT occur a dust send to the contract address.
          // It's a regular 0-value contract-call
          assetId: isDeposit ? asset.assetId : feeAsset.assetId,
          to: inboundAddressData.router,
          from: accountAssetAddress,
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
        if (!inboundAddressData || !accountAssetAddress) return undefined
        return {
          amountCryptoPrecision: isDeposit ? amountCryptoPrecision : dustAmountCryptoPrecision,
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
    memo,
    feeAsset,
    amountCryptoPrecision,
    isDeposit,
    isRuneTx,
    runeAccountId,
    poolAssetAccountId,
    inboundAddressData,
    accountAssetAddress,
  ])

  const { data: estimatedFeesData, isLoading: isEstimatedFeesDataLoading } =
    useGetEstimatedFeesQuery({
      amountCryptoPrecision: estimateFeesArgs?.amountCryptoPrecision ?? '0',
      assetId: estimateFeesArgs?.assetId ?? '',
      to: estimateFeesArgs?.to ?? '',
      sendMax: estimateFeesArgs?.sendMax ?? false,
      memo: estimateFeesArgs?.memo ?? '',
      accountId: estimateFeesArgs?.accountId ?? '',
      contractAddress: estimateFeesArgs?.contractAddress ?? '',
      enabled: !!estimateFeesArgs,
      disableRefetch: Boolean(txId),
    })

  const estimatedFeeDataCryptoPrecision = useMemo(() => {
    if (!estimatedFeesData || !feeAsset) return undefined

    return fromBaseUnit(estimatedFeesData.txFeeCryptoBaseUnit, feeAsset?.precision)
  }, [estimatedFeesData, feeAsset])

  const handleSignTx = useCallback(() => {
    setIsSubmitting(true)
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
            if (runeAccountNumber === undefined) throw new Error(`No account number found for RUNE`)

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

            setTxId(txId)
            setSerializedTxIndex(
              serializeTxIndex(runeAccountId, txId, account, { memo, parser: 'thorchain' }),
            )

            break
          }
          case 'EvmCustomTx': {
            if (!accountAssetAddress) throw new Error('No accountAddress found')
            if (!inboundAddressData?.address) throw new Error('No vault address found')
            if (!inboundAddressData?.router) throw new Error('No router address found')
            if (assetAccountNumber === undefined) throw new Error('No account number found')

            const amountOrDustCryptoBaseUnit = isDeposit
              ? amountCryptoBaseUnit
              : dustAmountCryptoBaseUnit

            const data = depositWithExpiry({
              vault: getAddress(inboundAddressData.address),
              asset: isToken(fromAssetId(assetId).assetReference)
                ? getAddress(fromAssetId(assetId).assetReference)
                : // Native EVM assets use the 0 address as the asset address
                  // https://dev.thorchain.org/concepts/sending-transactions.html#admonition-info-1
                  zeroAddress,
              amount: amountOrDustCryptoBaseUnit,
              memo,
              expiry: BigInt(dayjs().add(15, 'minute').unix()),
            })

            const adapter = assertGetEvmChainAdapter(asset.chainId)

            const buildCustomTxInput = await createBuildCustomTxInput({
              accountNumber: assetAccountNumber,
              adapter,
              data,
              // value is always denominated in fee asset - the only value we can send when calling a contract is native asset value
              value: isToken(fromAssetId(assetId).assetReference)
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

            setTxId(txid)
            setSerializedTxIndex(serializeTxIndex(poolAssetAccountId, txid, accountAssetAddress!))

            break
          }
          case 'Send': {
            if (!inboundAddressData) throw new Error('No inboundAddressData found')
            // ATOM/RUNE/ UTXOs- obviously make me a switch case for things to be cleaner
            if (!accountAssetAddress) throw new Error('No accountAddress found')
            if (!estimateFeesArgs) throw new Error('No estimateFeesArgs found')

            const estimatedFees = await estimateFees(estimateFeesArgs)
            const sendInput: SendInput = {
              amountCryptoPrecision: isDeposit ? amountCryptoPrecision : dustAmountCryptoPrecision,
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
      setStatus(TxStatus.Pending)
      setIsSubmitting(false)
    })
  }, [
    assetId,
    poolAssetId,
    asset,
    feeAsset,
    poolAsset,
    wallet,
    memo,
    isRuneTx,
    inboundAddressData,
    refetchIsTradingActive,
    runeAccountId,
    poolAssetAccountId,
    amountCryptoPrecision,
    runeAccountNumber,
    isDeposit,
    assetAccountNumber,
    accountAssetAddress,
    estimateFeesArgs,
    selectedCurrency,
  ])

  const txIdLink = useMemo(
    () =>
      getTxLink({
        defaultExplorerBaseUrl: 'https://viewblock.io/thorchain/tx/',
        txId: txId ?? '',
        name: SwapperName.Thorchain,
      }),
    [txId],
  )

  const confirmTranslation = useMemo(() => {
    if (isTradingActive === false) return translate('common.poolHalted')

    return translate('common.signTransaction')
  }, [isTradingActive, translate])

  if (!asset || !feeAsset) return null

  return (
    <Card>
      <CardHeader gap={2} display='flex' flexDir='row' alignItems='center'>
        <AssetIcon size='xs' assetId={asset.assetId} />
        <Amount.Crypto fontWeight='bold' value={amountCryptoPrecision} symbol={asset.symbol} />{' '}
        {isSymWithdraw && (
          <>
            <AssetIcon size='xs' assetId={poolAsset?.assetId} />
            <Amount.Crypto
              fontWeight='bold'
              value={poolAmountCryptoPrecision}
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
                  symbol={feeAsset.symbol}
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
