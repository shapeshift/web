import { CheckCircleIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Card,
  CardBody,
  Center,
  Flex,
  Heading,
  HStack,
  Link,
  Stack,
  Text,
} from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, ethChainId, fromAccountId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import {
  ContractType,
  FOXY_STAKING_CONTRACT,
  getOrCreateContractByType,
  viemEthMainnetClient,
} from '@shapeshiftoss/contracts'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Address } from 'viem'
import { encodeFunctionData, formatUnits, getAddress, maxUint256 } from 'viem'

import { Amount } from '@/components/Amount/Amount'
import { Main } from '@/components/Layout/Main'
import { RawText } from '@/components/Text/Text'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { middleEllipsis } from '@/lib/utils'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
  getApproveContractData,
} from '@/lib/utils/evm'
import {
  selectAccountIdsByChainIdFilter,
  selectAssetById,
  selectPortfolioAccountMetadata,
  selectPortfolioLoadingStatus,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const FOXY_TOKEN = '0xDc49108ce5C57bc3408c3A5E95F3d864eC386Ed3'

// FOXy is a rebasing token, so a fully-recovered position leaves sub-display dust (a few wei of
// gons rounding) rather than an exact 0. Treat anything below this as "nothing to recover" so we
// don't strand a stray "0 FOX" card with an active button after a successful claim.
const DUST_THRESHOLD = 10n ** 14n // 0.0001 FOX

// Minimal ABI — only what recovery needs.
const stakingAbi = [
  {
    type: 'function',
    name: 'coolDownInfo',
    stateMutability: 'view',
    inputs: [{ type: 'address' }],
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'gons', type: 'uint256' },
      { name: 'expiry', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'unstake',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'uint256' }, { type: 'bool' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'claimWithdraw',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'address' }],
    outputs: [],
  },
] as const

type BaseAccount = { accountId: AccountId; accountNumber: number; address: Address }
type FoxyAccount = BaseAccount & {
  staked: bigint
  allowance: bigint
  pending: bigint
}

export const Foxy = () => {
  const wallet = useWallet().state.wallet
  const adapter = useMemo(() => assertGetEvmChainAdapter(ethChainId), [])
  const foxyToken = useMemo(
    () =>
      getOrCreateContractByType({
        address: FOXY_TOKEN,
        type: ContractType.ERC20,
        chainId: ethChainId,
      }),
    [],
  )

  const ethAccountIds = useAppSelector(state =>
    selectAccountIdsByChainIdFilter(state, { chainId: ethChainId }),
  )
  const accountMetadata = useAppSelector(selectPortfolioAccountMetadata)
  const isPortfolioLoaded = useAppSelector(selectPortfolioLoadingStatus) === 'success'

  // Every EVM account the connected wallet has, with its derivation index (accountNumber).
  const baseAccounts = useMemo<BaseAccount[]>(
    () =>
      ethAccountIds
        .map(accountId => {
          const accountNumber = accountMetadata[accountId]?.bip44Params?.accountNumber
          if (accountNumber === undefined) return undefined
          return {
            accountId,
            accountNumber,
            address: getAddress(fromAccountId(accountId).account),
          }
        })
        .filter((a): a is BaseAccount => Boolean(a)),
    [ethAccountIds, accountMetadata],
  )

  const [accounts, setAccounts] = useState<FoxyAccount[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busyAccountId, setBusyAccountId] = useState<AccountId>()
  const [status, setStatus] = useState<Record<AccountId, string>>({})
  const [recovered, setRecovered] = useState<
    Record<AccountId, { amount: bigint; txHash?: string }>
  >({})
  const reqRef = useRef(0)

  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const txLink = (txHash: string | undefined) =>
    txHash && ethAsset ? `${ethAsset.explorerTxLink}${txHash}` : undefined

  const refresh = useCallback(async () => {
    const reqId = ++reqRef.current
    const next = await Promise.all(
      baseAccounts.map(async base => {
        const [staked, allowance, cd] = await Promise.all([
          foxyToken.read.balanceOf([base.address]),
          foxyToken.read.allowance([base.address, getAddress(FOXY_STAKING_CONTRACT)]),
          viemEthMainnetClient.readContract({
            address: getAddress(FOXY_STAKING_CONTRACT),
            abi: stakingAbi,
            functionName: 'coolDownInfo',
            args: [base.address],
          }),
        ])
        return { ...base, staked, allowance, pending: cd[0] }
      }),
    )
    if (reqId !== reqRef.current) return // a newer refresh superseded this one
    setAccounts(next)
    setLoaded(true)
  }, [baseAccounts, foxyToken])

  useEffect(() => {
    if (!isPortfolioLoaded) return
    refresh()
  }, [isPortfolioLoaded, refresh])

  const send = useCallback(
    async (account: BaseAccount, to: string, data: string) => {
      if (!wallet) return
      const buildCustomTxInput = await createBuildCustomTxInput({
        accountNumber: account.accountNumber,
        from: account.address,
        adapter,
        data,
        to: getAddress(to),
        value: '0',
        wallet,
      })
      const txid = await buildAndBroadcast({
        adapter,
        buildCustomTxInput,
        receiverAddress: CONTRACT_INTERACTION,
      })
      // waitForTransactionReceipt does not throw on a mined-but-reverted tx — surface it so a
      // failed approve/unstake shows an error instead of silently continuing the flow.
      const receipt = await viemEthMainnetClient.waitForTransactionReceipt({
        hash: txid as `0x${string}`,
      })
      if (receipt.status === 'reverted') throw new Error('Transaction reverted')
      return txid
    },
    [adapter, wallet],
  )

  const recover = useCallback(
    async (account: FoxyAccount) => {
      const total = account.staked + account.pending
      const setMsg = (msg: string) => setStatus(prev => ({ ...prev, [account.accountId]: msg }))
      setBusyAccountId(account.accountId)
      setMsg('')
      try {
        // 1. Approve FOXy → staking contract, only if the allowance doesn't already cover it.
        if (account.staked > 0n && account.allowance < account.staked) {
          setMsg('Approving FOXy…')
          await send(
            account,
            FOXY_TOKEN,
            getApproveContractData({
              approvalAmountCryptoBaseUnit: maxUint256.toString(),
              to: FOXY_TOKEN,
              spender: FOXY_STAKING_CONTRACT,
              chainId: ethChainId,
            }),
          )
        }

        // 2. Unstake the full wallet balance.
        if (account.staked > 0n) {
          setMsg('Unstaking…')
          await send(
            account,
            FOXY_STAKING_CONTRACT,
            encodeFunctionData({
              abi: stakingAbi,
              functionName: 'unstake',
              args: [account.staked, true],
            }),
          )
        }

        // 3. Claim — sends the FOX to the wallet.
        setMsg('Claiming FOX…')
        const claimTxHash = await send(
          account,
          FOXY_STAKING_CONTRACT,
          encodeFunctionData({
            abi: stakingAbi,
            functionName: 'claimWithdraw',
            args: [account.address],
          }),
        )

        // Refetch on-chain state so the position reflects the completed recovery.
        await refresh()
        setRecovered(prev => ({
          ...prev,
          [account.accountId]: { amount: total, txHash: claimTxHash },
        }))
        setMsg('')
      } catch (err) {
        console.error(err)
        setMsg('Transaction failed or was rejected.')
      } finally {
        setBusyAccountId(undefined)
      }
    },
    [refresh, send],
  )

  const displayAccounts = useMemo(
    () =>
      accounts.filter(
        a => recovered[a.accountId] !== undefined || a.staked + a.pending >= DUST_THRESHOLD,
      ),
    [accounts, recovered],
  )

  const body = (() => {
    if (!wallet) return <Text color='text.subtle'>Connect a wallet to withdraw your FOX.</Text>
    if (!isPortfolioLoaded || !loaded) return <Text color='text.subtle'>Loading…</Text>
    if (!displayAccounts.length)
      return <Text color='text.subtle'>No staked FOX to withdraw for this wallet.</Text>
    return (
      <Stack spacing={3}>
        {displayAccounts.map(account => {
          const recoveredEntry = recovered[account.accountId]
          const remaining = account.staked + account.pending
          const isRecovered = recoveredEntry !== undefined && remaining < DUST_THRESHOLD
          const recoveredTxLink = isRecovered ? txLink(recoveredEntry.txHash) : undefined
          const busy = busyAccountId === account.accountId
          const error = status[account.accountId]
          return (
            <Box
              key={account.accountId}
              bg='background.surface.raised.base'
              borderWidth={1}
              borderColor='border.base'
              borderRadius='xl'
              p={4}
            >
              <Stack spacing={3}>
                <Flex justify='space-between' align='center'>
                  <RawText fontFamily='monospace' fontSize='sm' color='text.subtle'>
                    {middleEllipsis(account.address)}
                  </RawText>
                  {isRecovered && (
                    <HStack spacing={1.5} color='green.500'>
                      <CheckCircleIcon boxSize={3.5} />
                      <RawText fontSize='sm' fontWeight='semibold'>
                        Withdrawn
                      </RawText>
                    </HStack>
                  )}
                </Flex>
                <Amount.Crypto
                  fontSize='2xl'
                  fontWeight='bold'
                  color={isRecovered ? 'text.subtle' : undefined}
                  value={formatUnits(isRecovered ? recoveredEntry.amount : remaining, 18)}
                  symbol='FOX'
                  maximumFractionDigits={4}
                  omitDecimalTrailingZeros
                />
                {recoveredTxLink && (
                  <Link href={recoveredTxLink} isExternal color='blue.500' fontSize='sm'>
                    View transaction <ExternalLinkIcon boxSize={3} mb='2px' />
                  </Link>
                )}
                {!isRecovered && (
                  <Button
                    colorScheme='blue'
                    size='lg'
                    width='full'
                    isLoading={busy}
                    loadingText={status[account.accountId] || 'Working…'}
                    isDisabled={!!busyAccountId}
                    onClick={() => recover(account)}
                  >
                    Withdraw FOX
                  </Button>
                )}
                {!isRecovered && !busy && error && (
                  <Text fontSize='sm' color='red.500'>
                    {error}
                  </Text>
                )}
              </Stack>
            </Box>
          )
        })}
      </Stack>
    )
  })()

  return (
    <Main>
      <Center py={12}>
        <Card maxWidth='480px' width='100%'>
          <CardBody>
            <Stack spacing={5}>
              <Stack spacing={1} pb={4} borderBottomWidth={1} borderColor='border.base'>
                <Heading size='md'>FOXy</Heading>
                <Text color='text.subtle' fontSize='sm'>
                  This staking program has ended. Withdraw your staked FOX below.
                </Text>
              </Stack>
              {body}
            </Stack>
          </CardBody>
        </Card>
      </Center>
    </Main>
  )
}
