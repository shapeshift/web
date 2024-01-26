import { Button, Card, CardBody, CardHeader, Center, Collapse, Flex, Link } from '@chakra-ui/react'
import { type AssetId, fromAccountId, fromAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION, type FeeDataEstimate } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getOrCreateContractByType } from 'contracts/contractManager'
import { ContractType } from 'contracts/types'
import dayjs from 'dayjs'
import { utils } from 'ethers/lib/ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaCheck } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { encodeFunctionData, getAddress } from 'viem'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { estimateFees } from 'components/Modals/Send/utils'
import { Row } from 'components/Row/Row'
import { useWallet } from 'hooks/useWallet/useWallet'
import { toBaseUnit } from 'lib/math'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { assertGetThorchainChainAdapter } from 'lib/utils/cosmosSdk'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
  getSupportedEvmChainIds,
} from 'lib/utils/evm'
import { waitForThorchainUpdate } from 'lib/utils/thorchain'
import {
  selectAssetById,
  selectFirstAccountIdByChainId,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

type TransactionRowProps = {
  assetId?: AssetId
  amountCryptoPrecision: string
  onComplete: () => void
  isActive?: boolean
  isLast?: boolean
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  assetId,
  amountCryptoPrecision,
  onComplete,
  isActive,
}) => {
  const queryClient = useQueryClient()
  const translate = useTranslate()
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  // TODO(gomes): we'll probably need this when implementing waitForThorchainUpdate
  // const [status, setStatus] = useState(TxStatus.Unknown)
  const [txId, setTxId] = useState<string | null>(null)
  const wallet = useWallet().state.wallet

  // FIXME: there should be recieved as part of confirmedQuote
  const defaultAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, asset?.chainId ?? ''),
  )
  // TODO(gomes): this is obviously wrong, this component doesn't have the notion of two assets.
  const defaultRuneAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, asset?.chainId ?? ''),
  )

  // TODO(gomes): introspect UTXO from address
  const accountAddress = useMemo(
    () => defaultAssetAccountId && fromAccountId(defaultAssetAccountId).account,
    [defaultAssetAccountId],
  )
  const serializedTxIndex = useMemo(() => {
    if (!(txId && accountAddress && defaultAssetAccountId)) return ''
    return serializeTxIndex(defaultAssetAccountId, txId, accountAddress)
  }, [accountAddress, defaultAssetAccountId, txId])

  const tx = useAppSelector(gs => selectTxById(gs, serializedTxIndex))

  const { mutateAsync } = useMutation({
    mutationKey: [txId],
    mutationFn: async ({ txId: _txId }: { txId: string }) => {
      console.log('waiting for thorchain update')
      await waitForThorchainUpdate({
        txId: _txId,
        skipOutbound: true, // this is an LP Tx, there is no outbound
      }).promise
      console.log('thorchain update complete')
    },
    onSuccess: async () => {
      console.log({ allQueries: queryClient.getQueryCache().getAll() })
      await queryClient.refetchQueries({
        queryKey: [reactQueries.thorchainLp.liquidityMember._def],
        exact: false,
        stale: true,
      })
      await queryClient.refetchQueries({
        queryKey: [reactQueries.thorchainLp.liquidityMembers._def],
        exact: false,
        stale: true,
      })
      await queryClient.refetchQueries({
        queryKey: [reactQueries.thorchainLp.userLpData._def],
        exact: false,
        stale: true,
      })
      await queryClient.refetchQueries({
        queryKey: [reactQueries.thorchainLp.liquidityProviderPosition._def],
        exact: false,
        stale: true,
      })
      console.log({ allQueriesAfterInvalidation: queryClient.getQueryCache().getAll() })
    },
  })

  useEffect(() => {
    if (!(txId && tx)) return
    if (tx?.status !== TxStatus.Confirmed) return
    ;(async () => {
      await mutateAsync({ txId })
    })()
  }, [mutateAsync, tx, txId])

  const { data: inboundAddressData, isLoading: isInboundAddressLoading } = useQuery({
    ...reactQueries.thornode.inboundAddress(assetId),
    enabled: !!assetId,
    select: data => data?.unwrap(),
  })

  console.log({ inboundAddressData })
  const handleSignTx = useCallback(() => {
    if (!asset) return
    if (!wallet) return

    const supportedEvmChainIds = getSupportedEvmChainIds()

    return (async () => {
      const isRuneTx = asset.assetId === thorchainAssetId
      // TODO(gomes): AccountId should be programmatic obviously, and there is no notion of ROON/Asset here anyway
      const accountId = isRuneTx ? defaultRuneAccountId : defaultAssetAccountId
      if (!accountId) throw new Error(`No accountId found for asset ${asset.assetId}`)
      const { account } = fromAccountId(accountId)
      const poolAssetId = assetIdToPoolAssetId({ assetId: asset.assetId })
      const memo = `+:${poolAssetId}::ss:29` // FIXME(gomes): make it work for RUNE, but also for asset deposits
      const amountCryptoBaseUnit = toBaseUnit(amountCryptoPrecision, asset.precision)

      // TODO(gomes): implement me proper, and move me to the right place
      // const estimatedFees = await estimateFees({
      // cryptoAmount: amountCryptoBaseUnit,
      // assetId: asset.assetId,
      // TODO(gomes): this is wrong. This isn't a memo, but should be depositWithExpiry for EVM chains,
      // and similar calls for others, add isTokenDeposit logic if applicable
      // memo: supportedEvmChainIds.includes(fromAssetId(asset.assetId).chainId as KnownChainIds)
      // ? utils.hexlify(utils.toUtf8Bytes(memo))
      // : memo,
      // to: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146', // TODO(gomes): router contract
      // sendMax: false,
      // accountId,
      // contractAddress: undefined,
      // })

      await (async () => {
        // We'll probably need to switch on chainNamespace instead here
        if (isRuneTx) {
          // const adapter = assertGetThorchainChainAdapter()
          //
          // LP deposit using THOR is a MsgDeposit tx
          // const { txToSign } = await adapter.buildDepositTransaction({
          // from: account,
          // accountNumber: 0, // FIXME
          // value: amountCryptoBaseUnit,
          // memo,
          // chainSpecific: {
          // gas: (estimatedFees as FeeDataEstimate<KnownChainIds.ThorchainMainnet>).fast
          // .chainSpecific.gasLimit,
          // fee: (estimatedFees as FeeDataEstimate<KnownChainIds.ThorchainMainnet>).fast.txFee,
          // },
          // })
          //
          // return { txToSign, adapter }
          // TODO(gomes): isEvmDeposit here, also handle UTXOs and ATOM, make this a switch
        } else {
          if (!inboundAddressData?.router) return

          const thorContract = getOrCreateContractByType({
            address: inboundAddressData.router,
            type: ContractType.ThorRouter,
            chainId: asset.chainId,
          })

          const expiry = BigInt(dayjs().add(15, 'minute').unix())
          const data = encodeFunctionData({
            abi: thorContract.abi,
            functionName: 'depositWithExpiry',
            args: [
              // vault, TODO(gomes): fetch me programatically per asset
              '0x64Fc77C58122a7fb66659Dc4D54d8CBb35EafF3b',
              // TODO(gomes): handle non-native assets here
              '0x0000000000000000000000000000000000000000',
              // getAddress(fromAssetId(assetId).assetReference),
              BigInt(amountCryptoBaseUnit.toString()),
              memo,
              expiry,
            ],
          })

          const adapter = assertGetEvmChainAdapter(asset.chainId)

          const buildCustomTxInput = await createBuildCustomTxInput({
            accountNumber: 0, // TODO(gomes) programmatic
            adapter,
            data,
            value: amountCryptoBaseUnit.toString(),
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
        }
      })()

      // setStatus(TxStatus.Pending) // TODO(gomes): this should be done automagically using reactivity from the Txid
      // setTxId('200') // TODO(gomes)
      // await adapter.broadcastTransaction({
      // senderAddress: account,
      // receiverAddress: '0xD37BbE5744D730a1d98d8DC97c42F0Ca46aD7146', // FIXME: Thorchain router contract
      // hex: signedTx,
      // })
    })()
  }, [
    amountCryptoPrecision,
    asset,
    defaultAssetAccountId,
    defaultRuneAccountId,
    inboundAddressData?.router,
    wallet,
  ])

  useEffect(() => {
    // TODO(gomes): obviously waitForThorchainUpdate instead of Tx complete but that'll do for now
    if (tx?.status === TxStatus.Confirmed) {
      onComplete()
    }
  }, [onComplete, tx?.status])

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
          {tx?.status === TxStatus.Confirmed ? (
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
            <CircularProgress isIndeterminate={tx?.status === TxStatus.Pending} size='24px' />
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
            isLoading={tx?.status === TxStatus.Pending || isInboundAddressLoading}
          >
            {translate('common.signTransaction')}
          </Button>
        </CardBody>
      </Collapse>
    </Card>
  )
}
