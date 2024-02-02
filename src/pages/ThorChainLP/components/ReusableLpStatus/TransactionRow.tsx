import { Button, Card, CardBody, CardHeader, Center, Collapse, Flex, Link } from '@chakra-ui/react'
import { AddressZero } from '@ethersproject/constants'
import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import {
  type AssetId,
  cosmosChainId,
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
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaCheck } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { getAddress } from 'viem'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import type { SendInput } from 'components/Modals/Send/Form'
import { estimateFees, handleSend } from 'components/Modals/Send/utils'
import { Row } from 'components/Row/Row'
import { useWallet } from 'hooks/useWallet/useWallet'
import { toBaseUnit } from 'lib/math'
import { sleep } from 'lib/poll/poll'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { assertUnreachable, isToken } from 'lib/utils'
import { assertGetThorchainChainAdapter } from 'lib/utils/cosmosSdk'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
  getSupportedEvmChainIds,
} from 'lib/utils/evm'
import { getThorchainFromAddress, waitForThorchainUpdate } from 'lib/utils/thorchain'
import { THORCHAIN_POOL_MODULE_ADDRESS } from 'lib/utils/thorchain/constants'
import type { AsymSide, LpConfirmedDepositQuote } from 'lib/utils/thorchain/lp/types'
import { depositWithExpiry } from 'lib/utils/thorchain/routerCalldata'
import { getThorchainLpPosition } from 'pages/ThorChainLP/queries/queries'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'
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
  accountIdsByChainId: Record<ChainId, AccountId>
  poolAssetId?: AssetId
  amountCryptoPrecision: string
  onComplete: () => void
  isActive?: boolean
  isLast?: boolean
  confirmedQuote: LpConfirmedDepositQuote
  asymSide?: AsymSide | null
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  assetId,
  poolAssetId,
  amountCryptoPrecision,
  onComplete,
  isActive,
  accountIdsByChainId,
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
  const [txId, setTxId] = useState<string | null>(null)
  const wallet = useWallet().state.wallet

  const runeAccountId = accountIdsByChainId[thorchainChainId]
  const poolAssetAccountId =
    accountIdsByChainId[poolAsset?.assetId ? fromAssetId(poolAsset.assetId).chainId : '']
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
      setOtherAssetAddress(_otherAssetAddress)
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
    ...reactQueries.thornode.inboundAddress(assetId),
    enabled: !!assetId,
    select: data => data?.unwrap(),
  })

  const handleSignTx = useCallback(() => {
    if (
      !(
        assetId &&
        poolAssetId &&
        asset &&
        poolAsset &&
        wallet &&
        (isRuneTx || inboundAddressData?.address)
      )
    )
      return

    return (async () => {
      const accountId = isRuneTx ? runeAccountId : poolAssetAccountId
      if (!accountId) throw new Error(`No accountId found for asset ${asset.assetId}`)
      const { account } = fromAccountId(accountId)
      // TODO(gomes): rename the utils to use the same terminology as well instead of the current poolAssetId one.
      // Left as-is for this PR to avoid a bigly diff
      const thorchainNotationAssetId = assetIdToPoolAssetId({
        assetId: isRuneTx ? poolAsset.assetId : asset.assetId,
      })
      const amountCryptoBaseUnit = toBaseUnit(amountCryptoPrecision, asset.precision)

      // A THOR LP deposit can either be:
      // - a RUNE MsgDeposit message type
      // - an EVM custom Tx, i.e a Tx with calldata
      // - a regular send with a memo (for ATOM and UTXOs)
      const transactionType = (() => {
        const supportedEvmChainIds = getSupportedEvmChainIds()
        if (isRuneTx) return 'MsgDeposit'
        if (supportedEvmChainIds.includes(fromAssetId(asset.assetId).chainId as KnownChainIds)) {
          return 'EvmCustomTx'
        }
        if (
          isUtxoChainId(fromAssetId(assetId).chainId) ||
          fromAssetId(assetId).chainId === cosmosChainId
        )
          return 'Send'

        throw new Error(`Unsupported ChainId ${fromAssetId(assetId).chainId}`)
      })()

      await (async () => {
        // We'll probably need to switch on chainNamespace instead here
        switch (transactionType) {
          case 'MsgDeposit': {
            if (runeAccountNumber === undefined) throw new Error(`No account number found for RUNE`)

            const adapter = assertGetThorchainChainAdapter()
            const memo = `+:${thorchainNotationAssetId}:${otherAssetAddress ?? ''}:ss:${
              confirmedQuote.feeBps
            }`

            const estimatedFees = await estimateFees({
              cryptoAmount: amountCryptoBaseUnit,
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
                  AddressZero

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

            const memo = `+:${thorchainNotationAssetId}:${otherAssetAddress ?? ''}:ss:${
              confirmedQuote.feeBps
            }`

            const estimateFeesArgs = {
              cryptoAmount: amountCryptoPrecision,
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
              cryptoAmount: amountCryptoPrecision,
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
    })
  }, [
    assetId,
    poolAssetId,
    asset,
    poolAsset,
    wallet,
    isRuneTx,
    inboundAddressData,
    runeAccountId,
    poolAssetAccountId,
    amountCryptoPrecision,
    runeAccountNumber,
    otherAssetAddress,
    confirmedQuote.feeBps,
    assetAccountNumber,
    accountAssetAddress,
    selectedCurrency,
  ])

  const txIdLink = useMemo(() => `${asset?.explorerTxLink}${txId}`, [asset?.explorerTxLink, txId])

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
              <Amount.Crypto value='0.02' symbol={asset.symbol} />
            </Row.Value>
          </Row>
          <Button
            mx={-2}
            size='lg'
            colorScheme='blue'
            onClick={handleSignTx}
            isLoading={status === TxStatus.Pending || isInboundAddressLoading}
          >
            {translate('common.signTransaction')}
          </Button>
        </CardBody>
      </Collapse>
    </Card>
  )
}
