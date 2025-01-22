import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { foxWifHatAssetId, fromAccountId } from '@shapeshiftoss/caip'
import { bnOrZero, CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import { FOX_WIF_HAT_MERKLE_DISTRIBUTOR_ABI } from '@shapeshiftoss/contracts/src/abis/foxWifHatMerkleDistributor'
import { useMutation } from '@tanstack/react-query'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { encodeFunctionData } from 'viem'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { RowProps } from 'components/Row/Row'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Timeline, TimelineItem } from 'components/Timeline/Timeline'
import { useEvmFees } from 'hooks/queries/useEvmFees'
import { useWallet } from 'hooks/useWallet/useWallet'
import { toBaseUnit } from 'lib/math'
import { firstFourLastFour } from 'lib/utils'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
} from 'lib/utils/evm'
import { FOX_WIF_HAT_MERKLE_DISTRIBUTOR_CONTRACT } from 'pages/Fox/constant'
import { useFoxWifHatMerkleTreeQuery } from 'pages/Fox/hooks/useFoxWifHatMerkleTreeQuery'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import { FoxWifHatClaimRoutePaths } from './types'

type FoxWifHatClaimConfirmProps = {
  setClaimTxid: (txId: string) => void
  claimTxid: string | undefined
  accountId: AccountId
}

const CustomRow: React.FC<RowProps> = props => <Row fontSize='sm' fontWeight='medium' {...props} />

export const FoxWifHatClaimConfirm: FC<FoxWifHatClaimConfirmProps> = ({
  accountId,
  claimTxid,
  setClaimTxid,
}) => {
  const history = useHistory()
  const translate = useTranslate()
  const wallet = useWallet().state.wallet
  const accountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, { accountId }),
  )
  const foxWifHatAsset = useAppSelector(state => selectAssetById(state, foxWifHatAssetId))
  const getFoxWifHatClaimsQuery = useFoxWifHatMerkleTreeQuery()

  const claimQuote = useMemo(() => {
    const claim = getFoxWifHatClaimsQuery.data?.claims[fromAccountId(accountId).account]
    if (!claim) return null

    return claim
  }, [getFoxWifHatClaimsQuery.data, accountId])

  const amountCryptoPrecision = useMemo(() => {
    if (!claimQuote) return

    return bnOrZero(claimQuote.amount).toFixed()
  }, [claimQuote])

  const callData = useMemo(() => {
    if (!claimQuote) return '0x'

    return encodeFunctionData({
      abi: FOX_WIF_HAT_MERKLE_DISTRIBUTOR_ABI,
      functionName: 'claim',
      args: [
        BigInt(claimQuote.index),
        fromAccountId(accountId).account,
        toBaseUnit(claimQuote.amount, foxWifHatAsset?.precision ?? 0),
        claimQuote.proof,
      ],
    })
  }, [claimQuote, accountId, foxWifHatAsset])

  const {
    mutateAsync: handleClaim,
    isIdle: isClaimMutationIdle,
    isPending: isClaimMutationPending,
    isSuccess: isClaimMutationSuccess,
  } = useMutation({
    mutationFn: async () => {
      if (!wallet || accountNumber === undefined) return

      const adapter = assertGetEvmChainAdapter(fromAccountId(accountId).chainId)

      const buildCustomTxInput = await createBuildCustomTxInput({
        accountNumber,
        from: fromAccountId(accountId).account,
        adapter,
        data: callData,
        value: '0',
        to: FOX_WIF_HAT_MERKLE_DISTRIBUTOR_CONTRACT,
        wallet,
      })

      const txId = await buildAndBroadcast({
        adapter,
        buildCustomTxInput,
        receiverAddress: CONTRACT_INTERACTION, // no receiver for this contract call
      })

      return txId
    },
    onSuccess: (txId: string | undefined) => {
      if (!txId) return

      setClaimTxid(txId)
    },
  })

  const isGetClaimFeesEnabled = useMemo(() => Boolean(isClaimMutationIdle), [isClaimMutationIdle])

  const claimFeesQueryInput = useMemo(
    () => ({
      to: FOX_WIF_HAT_MERKLE_DISTRIBUTOR_CONTRACT,
      from: fromAccountId(accountId).account,
      chainId: fromAccountId(accountId).chainId,
      accountNumber,
      data: callData,
      value: '0',
    }),
    [accountNumber, accountId, callData],
  )

  const {
    data: claimFees,
    isLoading: isClaimFeesLoading,
    isSuccess: isClaimFeesSuccess,
  } = useEvmFees({
    ...claimFeesQueryInput,
    enabled: isGetClaimFeesEnabled,
    staleTime: 30_000,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    refetchInterval: isGetClaimFeesEnabled ? 15_000 : false,
  })

  const serializedClaimTxIndex = useMemo(() => {
    if (!(claimTxid && fromAccountId(accountId).account && accountId)) return ''
    return serializeTxIndex(accountId, claimTxid, fromAccountId(accountId).account)
  }, [claimTxid, accountId])

  const claimCard = useMemo(() => {
    return (
      <Card
        display='flex'
        alignItems='center'
        justifyContent='center'
        flexDir='column'
        gap={4}
        py={6}
        px={4}
        flex={1}
        mx={-2}
      >
        <AssetIcon size='sm' assetId={foxWifHatAssetId} />
        <Stack textAlign='center' spacing={0}>
          <Amount.Crypto value={amountCryptoPrecision} symbol={foxWifHatAsset?.symbol ?? ''} />
        </Stack>
      </Card>
    )
  }, [amountCryptoPrecision, foxWifHatAsset])

  const handleSubmit = useCallback(async () => {
    const txHash = await handleClaim()
    if (!txHash) return
    history.push(FoxWifHatClaimRoutePaths.Status)
  }, [handleClaim, history])

  const claimTx = useAppSelector(gs => selectTxById(gs, serializedClaimTxIndex))

  const isClaimTxPending = useMemo(
    () => isClaimMutationPending || (isClaimMutationSuccess && !claimTx),
    [claimTx, isClaimMutationPending, isClaimMutationSuccess],
  )

  return (
    <SlideTransition>
      <CardHeader display='flex' alignItems='center' gap={2}>
        <Flex textAlign='center'>{translate('common.claim')}</Flex>
        <Flex flex={1} />
      </CardHeader>
      <CardBody>
        <Stack spacing={6}>
          {claimCard}
          <Timeline>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('RFOX.claimReceiveAddress')}</Row.Label>
                <Row.Value>{firstFourLastFour(fromAccountId(accountId).account)}</Row.Value>
              </CustomRow>
            </TimelineItem>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('RFOX.networkFee')}</Row.Label>
                <Row.Value>
                  <Skeleton isLoaded={!isClaimFeesLoading}>
                    <Row.Value>
                      <Amount.Fiat value={claimFees?.txFeeFiat || '0.00'} />
                    </Row.Value>
                  </Skeleton>
                </Row.Value>
              </CustomRow>
            </TimelineItem>
          </Timeline>
        </Stack>
      </CardBody>

      <CardFooter
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='column'
        gap={4}
        px={6}
        bg='background.surface.raised.accent'
        borderBottomRadius='xl'
      >
        <Button
          size='lg'
          mx={-2}
          colorScheme='blue'
          isLoading={isClaimFeesLoading || isClaimTxPending}
          disabled={!isClaimFeesSuccess || isClaimTxPending}
          onClick={handleSubmit}
        >
          {translate('RFOX.confirmAndClaim')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
