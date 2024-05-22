import { ArrowBackIcon, InfoIcon } from '@chakra-ui/icons'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  IconButton,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useHistory } from 'react-router'
import { encodeFunctionData, getAddress } from 'viem'
import { arbitrum } from 'viem/chains'
import { useReadContract } from 'wagmi'
import { Amount } from 'components/Amount/Amount'
import type { RowProps } from 'components/Row/Row'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { middleEllipsis } from 'lib/utils'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  createBuildCustomTxInput,
} from 'lib/utils/evm'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectFeeAssetByChainId,
  selectMarketDataByAssetIdUserCurrency,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import type { RfoxChangeAddressQuote } from './types'
import { ChangeAddressRoutePaths, type ChangeAddressRouteProps } from './types'

const CustomRow: React.FC<RowProps> = props => <Row fontSize='sm' fontWeight='medium' {...props} />
const backIcon = <ArrowBackIcon />

type ChangeAddressConfirmProps = {
  confirmedQuote: RfoxChangeAddressQuote
  changeAddressTxid: string | undefined
  setChangeAddressTxid: (txId: string) => void
}

export const ChangeAddressConfirm: React.FC<
  ChangeAddressRouteProps & ChangeAddressConfirmProps
> = ({ changeAddressTxid, setChangeAddressTxid, confirmedQuote }) => {
  const queryClient = useQueryClient()
  const wallet = useWallet().state.wallet
  const history = useHistory()
  const translate = useTranslate()
  const stakingAsset = useAppSelector(state =>
    selectAssetById(state, confirmedQuote.stakingAssetId),
  )
  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(confirmedQuote.stakingAssetId).chainId),
  )
  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )

  const stakingAssetAccountAddress = useMemo(
    () => fromAccountId(confirmedQuote.stakingAssetAccountId).account,
    [confirmedQuote.stakingAssetAccountId],
  )

  const stakingAssetAccountNumberFilter = useMemo(() => {
    return {
      assetId: confirmedQuote.stakingAssetId,
      accountId: confirmedQuote.stakingAssetAccountId,
    }
  }, [confirmedQuote.stakingAssetAccountId, confirmedQuote.stakingAssetId])
  const stakingAssetAccountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, stakingAssetAccountNumberFilter),
  )

  const callData = useMemo(() => {
    return encodeFunctionData({
      abi: foxStakingV1Abi,
      functionName: 'setRuneAddress',
      args: [confirmedQuote.newRuneAddress],
    })
  }, [confirmedQuote.newRuneAddress])

  const isGetChangeAddressFeesEnabled = useMemo(
    () => Boolean(wallet && feeAsset && feeAssetMarketData),
    [wallet, feeAsset, feeAssetMarketData],
  )

  const {
    data: changeAddressFees,
    isLoading: isChangeAddressFeesLoading,
    isSuccess: isChangeAddressFeesSuccess,
  } = useQuery({
    ...reactQueries.common.evmFees({
      to: RFOX_PROXY_CONTRACT_ADDRESS,
      from: stakingAssetAccountAddress,
      accountNumber: stakingAssetAccountNumber!, // see isGetChangeAddressFeesEnabled
      data: callData,
      value: '0', // contract call
      wallet: wallet!, // see isGetChangeAddressFeesEnabled
      feeAsset: feeAsset!, // see isGetChangeAddressFeesEnabled
      feeAssetMarketData: feeAssetMarketData!, // see isGetChangeAddressFeesEnabled
    }),
    staleTime: 30_000,
    enabled: isGetChangeAddressFeesEnabled,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: 15_000,
  })

  const serializedChangeAddressTxIndex = useMemo(() => {
    if (!(changeAddressTxid && stakingAssetAccountAddress)) return ''
    return serializeTxIndex(
      confirmedQuote.stakingAssetAccountId,
      changeAddressTxid,
      stakingAssetAccountAddress,
    )
  }, [changeAddressTxid, confirmedQuote.stakingAssetAccountId, stakingAssetAccountAddress])

  const {
    mutateAsync: sendChangeAddressTx,
    isPending: isChangeAddressMutationPending,
    isSuccess: isChangeAddressMutationSuccess,
  } = useMutation({
    mutationFn: async () => {
      if (!wallet || stakingAssetAccountNumber === undefined || !stakingAsset || !callData) return

      const adapter = assertGetEvmChainAdapter(stakingAsset.chainId)

      const buildCustomTxInput = await createBuildCustomTxInput({
        accountNumber: stakingAssetAccountNumber,
        adapter,
        data: callData,
        value: '0',
        to: RFOX_PROXY_CONTRACT_ADDRESS,
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

      setChangeAddressTxid(txId)
    },
  })

  const { queryKey: stakingInfoQueryKey } = useReadContract({
    abi: foxStakingV1Abi,
    address: RFOX_PROXY_CONTRACT_ADDRESS,
    functionName: 'stakingInfo',
    args: [getAddress(stakingAssetAccountAddress)], // actually defined, see enabled below
    chainId: arbitrum.id,
  })

  const handleSubmit = useCallback(async () => {
    await sendChangeAddressTx(undefined)

    history.push(ChangeAddressRoutePaths.Status)

    // This isn't a mistake - we invalidate as a cleanup operation before unmount to avoid current subscribers refetching with wrong args, hence making invalidation useless
    await queryClient.invalidateQueries({ queryKey: stakingInfoQueryKey })
  }, [history, queryClient, sendChangeAddressTx, stakingInfoQueryKey])

  const changeAddressTx = useAppSelector(gs => selectTxById(gs, serializedChangeAddressTxIndex))
  const isChangeAddressTxPending = useMemo(
    () => isChangeAddressMutationPending || (isChangeAddressMutationSuccess && !changeAddressTx),
    [changeAddressTx, isChangeAddressMutationPending, isChangeAddressMutationSuccess],
  )

  const handleGoBack = useCallback(() => {
    history.push(ChangeAddressRoutePaths.Input)
  }, [history])

  const changeAddressCard = useMemo(() => {
    // TODO(gomes): implement current/new rune address display here
    if (!stakingAsset) return null

    return (
      <Card
        display='flex'
        alignItems='center'
        justifyContent='center'
        flexDir='column'
        flex={1}
        mx={-2}
      >
        <CardBody display='flex' gap={2} flexDir='column' width='full'>
          <RawText color='text.subtle' fontSize='sm' fontWeight='semibold'>
            {translate('RFOX.currentRewardAddress')}
          </RawText>
          <RawText fontSize='lg'>{middleEllipsis(confirmedQuote.currentRuneAddress)}</RawText>
        </CardBody>
        <Card width='full' borderWidth={1}>
          <CardBody display='flex' flexDir='column' width='full' gap={2}>
            <RawText color='text.subtle' fontSize='sm' fontWeight='semibold'>
              {translate('RFOX.newRewardAddress')}
            </RawText>
            <RawText fontSize='lg'>{middleEllipsis(confirmedQuote.newRuneAddress)}</RawText>
            <Flex alignItems='center' gap={2} fontSize='sm' color='text.subtle'>
              <InfoIcon />
              <RawText>{translate('RFOX.newAddressInfo')}</RawText>
            </Flex>
          </CardBody>
        </Card>
      </Card>
    )
  }, [confirmedQuote.currentRuneAddress, confirmedQuote.newRuneAddress, stakingAsset, translate])

  return (
    <SlideTransition>
      <CardHeader display='flex' alignItems='center' gap={2}>
        <Flex flex={1}>
          <IconButton onClick={handleGoBack} variant='ghost' aria-label='back' icon={backIcon} />
        </Flex>
        <Flex textAlign='center'>{translate('common.confirm')}</Flex>
        <Flex flex={1}></Flex>
      </CardHeader>
      <CardBody>
        <Stack spacing={6}>{changeAddressCard}</Stack>
      </CardBody>
      <CardFooter
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='column'
        gap={4}
        px={6}
        py={4}
        bg='background.surface.raised.accent'
      >
        <CustomRow>
          <Row.Label>{translate('common.gasFee')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={!isChangeAddressFeesLoading}>
              <Row.Value>
                <Amount.Fiat value={changeAddressFees?.txFeeFiat ?? '0.0'} />
              </Row.Value>
            </Skeleton>
          </Row.Value>
        </CustomRow>
      </CardFooter>
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
          isLoading={isChangeAddressFeesLoading || isChangeAddressTxPending}
          disabled={!isChangeAddressFeesSuccess || isChangeAddressTxPending}
          size='lg'
          mx={-2}
          colorScheme='blue'
          onClick={handleSubmit}
        >
          {translate('RFOX.confirmAndUpdateAddress')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
