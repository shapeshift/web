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
import { useMutation } from '@tanstack/react-query'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { encodeFunctionData } from 'viem'
import { Amount } from 'components/Amount/Amount'
import type { RowProps } from 'components/Row/Row'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { useEvmFees } from 'hooks/queries/useEvmFees'
import { useLedgerOpenApp } from 'hooks/useLedgerOpenApp/useLedgerOpenApp'
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
  const wallet = useWallet().state.wallet
  const history = useHistory()
  const translate = useTranslate()
  const stakingAsset = useAppSelector(state =>
    selectAssetById(state, confirmedQuote.stakingAssetId),
  )
  const feeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, fromAssetId(confirmedQuote.stakingAssetId).chainId),
  )
  const adapter = useMemo(
    () => (feeAsset ? assertGetEvmChainAdapter(fromAssetId(feeAsset.assetId).chainId) : undefined),
    [feeAsset],
  )
  const checkLedgerAppOpenIfLedgerConnected = useLedgerOpenApp()

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

  const changeAddressFeesQueryInput = useMemo(
    () => ({
      to: RFOX_PROXY_CONTRACT_ADDRESS,
      from: stakingAssetAccountAddress,
      chainId: fromAssetId(confirmedQuote.stakingAssetId).chainId,
      accountNumber: stakingAssetAccountNumber,
      data: callData,
      value: '0',
    }),
    [
      callData,
      confirmedQuote.stakingAssetId,
      stakingAssetAccountAddress,
      stakingAssetAccountNumber,
    ],
  )

  const {
    data: changeAddressFees,
    isLoading: isChangeAddressFeesLoading,
    isSuccess: isChangeAddressFeesSuccess,
  } = useEvmFees({
    ...changeAddressFeesQueryInput,
    enabled: true,
    staleTime: 30_000,
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
    mutateAsync: handleChangeAddress,
    isPending: isChangeAddressMutationPending,
    isSuccess: isChangeAddressMutationSuccess,
  } = useMutation({
    mutationFn: async () => {
      if (
        !wallet ||
        stakingAssetAccountNumber === undefined ||
        !stakingAsset ||
        !callData ||
        !adapter
      )
        return

      const buildCustomTxInput = await createBuildCustomTxInput({
        accountNumber: stakingAssetAccountNumber,
        from: fromAccountId(confirmedQuote.stakingAssetAccountId).account,
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

  const handleSubmit = useCallback(async () => {
    if (!stakingAsset) return

    await checkLedgerAppOpenIfLedgerConnected(stakingAsset.chainId)
      .then(async () => {
        await handleChangeAddress()
        history.push(ChangeAddressRoutePaths.Status)
      })
      .catch(console.error)
  }, [history, handleChangeAddress, stakingAsset, checkLedgerAppOpenIfLedgerConnected])

  const changeAddressTx = useAppSelector(gs => selectTxById(gs, serializedChangeAddressTxIndex))
  const isChangeAddressTxPending = useMemo(
    () => isChangeAddressMutationPending || (isChangeAddressMutationSuccess && !changeAddressTx),
    [changeAddressTx, isChangeAddressMutationPending, isChangeAddressMutationSuccess],
  )

  const handleGoBack = useCallback(() => {
    history.push(ChangeAddressRoutePaths.Input)
  }, [history])

  const changeAddressCard = useMemo(() => {
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
        <Flex flex={1} />
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
