import { Button, Card, CardBody, CardHeader, Center, Collapse, Flex, Link } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { type AssetId, fromAccountId, fromAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import {
  CONTRACT_INTERACTION,
  type FeeDataEstimate,
  FeeDataKey,
} from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getOrCreateContractByType } from 'contracts/contractManager'
import { ContractType } from 'contracts/types'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaCheck } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { encodeFunctionData, getAddress } from 'viem'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import type { SendInput } from 'components/Modals/Send/Form'
import { estimateFees, handleSend } from 'components/Modals/Send/utils'
import { Row } from 'components/Row/Row'
import { useWallet } from 'hooks/useWallet/useWallet'
import { toBaseUnit } from 'lib/math'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { isToken } from 'lib/utils'
import { assertGetThorchainChainAdapter } from 'lib/utils/cosmosSdk'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
  getSupportedEvmChainIds,
} from 'lib/utils/evm'
import { getThorchainFromAddress, waitForThorchainUpdate } from 'lib/utils/thorchain'
import type { ConfirmedQuote } from 'lib/utils/thorchain/lp/types'
import { useUserLpData } from 'pages/ThorChainLP/queries/hooks/useUserLpData'
import { getThorchainLpPosition } from 'pages/ThorChainLP/queries/queries'
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
  accountIds: Record<AssetId, AccountId>
  poolAssetId?: AssetId
  amountCryptoPrecision: string
  onComplete: () => void
  isActive?: boolean
  isLast?: boolean
  confirmedQuote: ConfirmedQuote
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  assetId,
  poolAssetId,
  amountCryptoPrecision,
  onComplete,
  isActive,
  accountIds,
  confirmedQuote,
}) => {
  const queryClient = useQueryClient()
  const translate = useTranslate()
  const selectedCurrency = useAppSelector(selectSelectedCurrency)
  // TOOO(gomes): we may be able to handle this better, or not
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const poolAsset = useAppSelector(state => selectAssetById(state, poolAssetId ?? ''))
  const [status, setStatus] = useState(TxStatus.Unknown)

  const [txId, setTxId] = useState<string | null>(null)
  const wallet = useWallet().state.wallet

  const assetAccountId = accountIds[asset?.assetId ?? '']
  const runeAccountId = accountIds[thorchainAssetId]
  const assetAccountNumberFilter = useMemo(
    () => ({ assetId: asset?.assetId ?? '', accountId: assetAccountId ?? '' }),
    [asset?.assetId, assetAccountId],
  )
  const runeAccountNumberFilter = useMemo(
    () => ({ assetId: thorchainAssetId, accountId: runeAccountId ?? '' }),
    [runeAccountId],
  )

  const assetAccountNumber = useAppSelector(s =>
    selectAccountNumberByAccountId(s, assetAccountNumberFilter),
  )
  const runeAccountNumber = useAppSelector(s =>
    selectAccountNumberByAccountId(s, runeAccountNumberFilter),
  )

  const { data: userData } = useUserLpData({
    assetId: poolAssetId ?? '',
    accountId: assetAccountId,
  })
  // TODO(gomes): destructure userAddress from this guy.
  // Test this extensively to ensure we *always* use this whenever possible, and only then default to the first UTXO address
  // perhaps getThorchainFromAddress could be used for LP too?
  const foundUserData = useMemo(() => {
    if (!userData) return undefined

    // TODO(gomes): when routed from the "Your positions" page, we will want to handle multi-account and narrow by AccountId
    // TODO(gomes): when supporting multi account for this, we will want to either handle default, highest balance account as default,
    // or, probably better from an architectural standpoint, have each account position be its separate row
    return userData?.find(data => data.opportunityId === confirmedQuote?.opportunityId)
  }, [confirmedQuote?.opportunityId, userData])

  const accountFilter = useMemo(() => ({ accountId: assetAccountId }), [assetAccountId])
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, accountFilter),
  )

  const [accountAddress, setAccountAddress] = useState<string | null>(null)

  useEffect(() => {
    if (!(wallet && asset && confirmedQuote?.opportunityId && accountMetadata)) return
    const accountId = asset?.assetId === thorchainAssetId ? runeAccountId : assetAccountId
    // TODO(gomes): double check this works both sides
    const assetId = asset?.assetId === thorchainAssetId ? thorchainAssetId : poolAssetId
    if (!assetId) return
    ;(async () => {
      const _accountAddress = await getThorchainFromAddress({
        accountId,
        assetId,
        opportunityId: confirmedQuote.opportunityId,
        wallet,
        accountMetadata,
        getPosition: getThorchainLpPosition,
      })
      setAccountAddress(_accountAddress)
    })()
  }, [
    accountMetadata,
    asset,
    assetAccountId,
    assetId,
    confirmedQuote.opportunityId,
    poolAssetId,
    runeAccountId,
    wallet,
  ])

  console.log({ accountAddress })

  const serializedTxIndex = useMemo(() => {
    if (!(txId && accountAddress && assetAccountId)) return ''
    return serializeTxIndex(assetAccountId, txId, accountAddress)
  }, [accountAddress, assetAccountId, txId])

  const tx = useAppSelector(gs => selectTxById(gs, serializedTxIndex))

  const { mutateAsync } = useMutation({
    mutationKey: [txId],
    mutationFn: async ({ txId: _txId }: { txId: string }) => {
      await waitForThorchainUpdate({
        txId: _txId,
        skipOutbound: true, // this is an LP Tx, there is no outbound
      }).promise
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [reactQueries.thorchainLp.liquidityMember._def],
        exact: false,
        stale: true,
      })
      await queryClient.invalidateQueries({
        queryKey: [reactQueries.thorchainLp.liquidityMembers._def],
        exact: false,
        stale: true,
      })
      await queryClient.invalidateQueries({
        queryKey: [reactQueries.thorchainLp.userLpData._def],
        exact: false,
        stale: true,
      })
      await queryClient.invalidateQueries({
        queryKey: [reactQueries.thorchainLp.liquidityProviderPosition._def],
        exact: false,
        stale: true,
      })

      setStatus(TxStatus.Confirmed)
      onComplete()
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
    const isRuneTx = asset?.assetId === thorchainAssetId

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
      const supportedEvmChainIds = getSupportedEvmChainIds()
      const isEvmTx = supportedEvmChainIds.includes(
        fromAssetId(asset.assetId).chainId as KnownChainIds,
      )
      // TODO(gomes): AccountId should be programmatic obviously, and there is no notion of ROON/Asset here anyway
      const accountId = isRuneTx ? runeAccountId : assetAccountId
      if (!accountId) throw new Error(`No accountId found for asset ${asset.assetId}`)
      const { account } = fromAccountId(accountId)
      // TODO(gomes): rename the utils to use the same terminology as well instead of the current poolAssetId one.
      // Left as-is for this PR to avoid a bigly diff
      const thorchainNotationAssetId = assetIdToPoolAssetId({
        assetId: isRuneTx ? poolAsset.assetId : asset.assetId,
      })
      const amountCryptoBaseUnit = toBaseUnit(amountCryptoPrecision, asset.precision)

      const otherAssetAddress = (() => {
        // We don't want to pair an address while depositing in case of asym. Txs
        if (foundUserData?.isAsymmetric) return ''

        // TODO(gomes): this will work for active positions only, use similar accountAddress logic
        return isRuneTx ? foundUserData?.assetAddress ?? '' : foundUserData?.runeAddress ?? ''
      })()
      await (async () => {
        // We'll probably need to switch on chainNamespace instead here
        if (isRuneTx) {
          if (runeAccountNumber === undefined) throw new Error(`No account number found for RUNE`)

          const adapter = assertGetThorchainChainAdapter()
          const memo = `+:${thorchainNotationAssetId}:${otherAssetAddress}:ss:29`

          const estimatedFees = await estimateFees({
            cryptoAmount: amountCryptoBaseUnit,
            assetId: asset.assetId,
            memo,
            to: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0', // PoolModule
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
            receiverAddress: 'thor1g98cy3n9mmjrpn0sxmn63lztelera37n8n67c0', // PoolModule
            hex: signedTx,
          })

          setTxId(txId)
        } else if (isEvmTx) {
          if (!inboundAddressData?.router) return

          const thorContract = getOrCreateContractByType({
            address: inboundAddressData.router,
            type: ContractType.ThorRouter,
            chainId: asset.chainId,
          })

          const args = (() => {
            const expiry = BigInt(dayjs().add(15, 'minute').unix())
            const vault = getAddress(inboundAddressData.address)
            const asset = isToken(fromAssetId(assetId).assetReference)
              ? getAddress(fromAssetId(assetId).assetReference)
              : '0x0000000000000000000000000000000000000000'

            // TODO(gomes): cleanup before opening me, yoloing this to get this to work initially
            // We should make this programmatic and abstracted. There is really no magic here - the only diff is we use the *pool* asset (dot) notation vs. the synth asset (slash notation)
            // but other than that, that's pretty much savers all over again. Similarly, swapper also calls this.
            // Why would we have to reinvent the wheel?
            const memo = `+:${thorchainNotationAssetId}:${otherAssetAddress}:ss:29`
            const amount = BigInt(amountCryptoBaseUnit.toString())

            return { memo, amount, expiry, vault, asset }
          })()

          const data = encodeFunctionData({
            abi: thorContract.abi,
            functionName: 'depositWithExpiry',
            args: [args.vault, args.asset, args.amount, args.memo, args.expiry],
          })

          const adapter = assertGetEvmChainAdapter(asset.chainId)

          const buildCustomTxInput = await createBuildCustomTxInput({
            accountNumber: 0, // TODO(gomes) programmatic
            adapter,
            data,
            value: isToken(fromAssetId(assetId).assetReference)
              ? '0'
              : amountCryptoBaseUnit.toString(),
            to: inboundAddressData.router,
            wallet,
          })

          // TODO(gomes): fees estimation
          const txid = await buildAndBroadcast({
            adapter,
            buildCustomTxInput,
            receiverAddress: CONTRACT_INTERACTION, // no receiver for this contract call
          })

          setTxId(txid)
        } else {
          if (!inboundAddressData) throw new Error('No inboundAddressData found')
          // ATOM/RUNE/ UTXOs- obviously make me a switch case for things to be cleaner
          if (!accountAddress) throw new Error('No accountAddress found')

          const memo = `+:${thorchainNotationAssetId}:${otherAssetAddress}:ss:29`

          const estimateFeesArgs = {
            cryptoAmount: amountCryptoPrecision,
            assetId,
            to: inboundAddressData?.address,
            from: accountAddress,
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
            from: accountAddress,
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
        }
      })()
    })().then(() => {
      setStatus(TxStatus.Pending)
    })
  }, [
    asset,
    assetId,
    poolAssetId,
    poolAsset,
    wallet,
    inboundAddressData,
    runeAccountId,
    assetAccountId,
    amountCryptoPrecision,
    foundUserData,
    runeAccountNumber,
    accountAddress,
    selectedCurrency,
  ])

  const txIdLink = useMemo(() => `${asset?.explorerTxLink}/${txId}`, [asset?.explorerTxLink, txId])

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
