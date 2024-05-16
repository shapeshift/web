import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  IconButton,
  Stack,
} from '@chakra-ui/react'
import { foxAssetId, fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useAllowance } from 'react-queries/hooks/useAllowance'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { RowProps } from 'components/Row/Row'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Timeline, TimelineItem } from 'components/Timeline/Timeline'
import { queryClient } from 'context/QueryClientProvider/queryClient'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { middleEllipsis } from 'lib/utils'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectTxById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import type { RfoxStakingQuote } from './types'
import { StakeRoutePaths, type StakeRouteProps } from './types'

const backIcon = <ArrowBackIcon />

const CustomRow: React.FC<RowProps> = props => <Row fontSize='sm' fontWeight='medium' {...props} />

type StakeConfirmProps = {
  confirmedQuote: RfoxStakingQuote
}
export const StakeConfirm: React.FC<StakeConfirmProps & StakeRouteProps> = ({ confirmedQuote }) => {
  const wallet = useWallet().state.wallet
  const history = useHistory()
  const translate = useTranslate()

  const [approvalTxId, setApprovalTxId] = useState<string | null>(null)

  const asset = useAppSelector(state => selectAssetById(state, foxAssetId))

  const poolAssetAccountNumberFilter = useMemo(() => {
    return {
      assetId: confirmedQuote.stakingAssetId,
      accountId: confirmedQuote.stakingAssetAccountId,
    }
  }, [confirmedQuote.stakingAssetAccountId, confirmedQuote.stakingAssetId])
  const stakingAssetAccountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, poolAssetAccountNumberFilter),
  )
  const stakingAssetAccountAddress = useMemo(
    () => fromAccountId(confirmedQuote.stakingAssetAccountId).account,
    [confirmedQuote.stakingAssetAccountId],
  )

  const {
    data: allowanceDataCryptoBaseUnit,
    isSuccess: isAllowanceDataSuccess,
    isLoading: isAllowanceDataLoading,
  } = useAllowance({
    assetId: asset?.assetId,
    // TODO(gomes): const somewhere
    spender: '0x0c66f315542fdec1d312c415b14eef614b0910ef',
    from: fromAccountId(confirmedQuote.stakingAssetAccountId).account,
  })

  const isApprovalRequired = useMemo(
    () => bnOrZero(allowanceDataCryptoBaseUnit).lt(confirmedQuote.stakingAmountCryptoBaseUnit),
    [allowanceDataCryptoBaseUnit, confirmedQuote.stakingAmountCryptoBaseUnit],
  )

  const handleGoBack = useCallback(() => {
    history.push(StakeRoutePaths.Input)
  }, [history])

  const serializedApprovalTxIndex = useMemo(() => {
    if (!(approvalTxId && stakingAssetAccountAddress && confirmedQuote.stakingAssetAccountId))
      return ''
    return serializeTxIndex(
      confirmedQuote.stakingAssetAccountId,
      approvalTxId,
      stakingAssetAccountAddress,
    )
  }, [approvalTxId, confirmedQuote.stakingAssetAccountId, stakingAssetAccountAddress])

  const {
    mutate,
    isPending: isApprovalMutationPending,
    isSuccess: isApprovalMutationSuccess,
  } = useMutation({
    ...reactQueries.mutations.approve({
      assetId: confirmedQuote.stakingAssetId,
      // TODO(gomes): const somewhere
      spender: '0x0c66f315542fdec1d312c415b14eef614b0910ef',
      from: stakingAssetAccountAddress,
      amount: confirmedQuote.stakingAmountCryptoBaseUnit,
      wallet,
      accountNumber: stakingAssetAccountNumber,
    }),
    onSuccess: (txId: string) => {
      setApprovalTxId(txId)
    },
  })

  const handleApprove = useCallback(() => mutate(undefined), [mutate])

  const approvalTx = useAppSelector(gs => selectTxById(gs, serializedApprovalTxIndex))
  const isApprovalTxPending = useMemo(
    () =>
      isApprovalMutationPending ||
      (isApprovalMutationSuccess && approvalTx?.status !== TxStatus.Confirmed),
    [approvalTx?.status, isApprovalMutationPending, isApprovalMutationSuccess],
  )

  useEffect(() => {
    if (!approvalTx) return
    if (isApprovalTxPending) return
    ;(async () => {
      await queryClient.invalidateQueries(
        reactQueries.common.allowanceCryptoBaseUnit(
          asset?.assetId,
          // TODO(gomes): const somewhere
          '0x0c66f315542fdec1d312c415b14eef614b0910ef',
          stakingAssetAccountAddress,
        ),
      )
    })()
  }, [approvalTx, asset?.assetId, isApprovalTxPending, stakingAssetAccountAddress])

  const handleSubmit = useCallback(() => {
    if (isApprovalRequired) return handleApprove()

    history.push(StakeRoutePaths.Status)
  }, [handleApprove, history, isApprovalRequired])

  const stakeCards = useMemo(() => {
    if (!asset) return null
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
        <AssetIcon size='sm' assetId={asset?.assetId} />
        <Stack textAlign='center' spacing={0}>
          <Amount.Crypto value='0.0' symbol={asset?.symbol} />
          <Amount.Fiat fontSize='sm' color='text.subtle' value='0.0' />
        </Stack>
      </Card>
    )
  }, [asset])

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
        <Stack spacing={6}>
          {stakeCards}
          <Timeline>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('RFOX.approvalFee')}</Row.Label>
                <Row.Value>
                  <Amount.Fiat value='0.0001' />
                </Row.Value>
              </CustomRow>
            </TimelineItem>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('RFOX.networkFee')}</Row.Label>
                <Row.Value>
                  <Amount.Fiat value='0.0001' />
                </Row.Value>
              </CustomRow>
            </TimelineItem>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('RFOX.shareOfPool')}</Row.Label>
                <Row.Value>
                  <Amount.Percent value='0.0' />
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
        py={4}
        bg='background.surface.raised.accent'
      >
        <CustomRow>
          <Row.Label>{translate('RFOX.thorchainRewardAddress')}</Row.Label>
          <Row.Value>{middleEllipsis(confirmedQuote.runeAddress)}</Row.Value>
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
          size='lg'
          mx={-2}
          disabled={!isAllowanceDataSuccess}
          isLoading={isAllowanceDataLoading || isApprovalTxPending}
          colorScheme='blue'
          onClick={handleSubmit}
        >
          {translate(isApprovalRequired ? 'common.approve' : 'RFOX.confirmAndStake')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
