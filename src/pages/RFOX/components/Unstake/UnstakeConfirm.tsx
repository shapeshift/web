import { ArrowBackIcon } from '@chakra-ui/icons'
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
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { RowProps } from 'components/Row/Row'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Timeline, TimelineItem } from 'components/Timeline/Timeline'
import { useLedgerOpenApp } from 'hooks/useLedgerOpenApp/useLedgerOpenApp'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useRfoxUnstake } from './hooks/useRfoxUnstake'
import type { RfoxUnstakingQuote } from './types'
import { UnstakeRoutePaths, type UnstakeRouteProps } from './types'

type UnstakeConfirmProps = {
  confirmedQuote: RfoxUnstakingQuote
  unstakeTxid: string | undefined
  setUnstakeTxid: (txId: string) => void
}

const CustomRow: React.FC<RowProps> = props => <Row fontSize='sm' fontWeight='medium' {...props} />
const backIcon = <ArrowBackIcon />

export const UnstakeConfirm: React.FC<UnstakeRouteProps & UnstakeConfirmProps> = ({
  confirmedQuote,
  unstakeTxid,
  setUnstakeTxid,
}) => {
  const history = useHistory()
  const translate = useTranslate()
  const checkLedgerAppOpenIfLedgerConnected = useLedgerOpenApp({ isSigning: true })

  const stakingAsset = useAppSelector(state =>
    selectAssetById(state, confirmedQuote.stakingAssetId),
  )

  const unstakingAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(confirmedQuote.unstakingAmountCryptoBaseUnit, stakingAsset?.precision ?? 0),
    [confirmedQuote.unstakingAmountCryptoBaseUnit, stakingAsset?.precision],
  )

  const stakingAssetMarketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, confirmedQuote.stakingAssetId),
  )

  const unstakingAmountUserCurrency = useMemo(
    () =>
      bnOrZero(unstakingAmountCryptoPrecision)
        .times(stakingAssetMarketDataUserCurrency.price)
        .toFixed(),
    [stakingAssetMarketDataUserCurrency.price, unstakingAmountCryptoPrecision],
  )

  const {
    unstakeFeesQuery: {
      data: unstakeFees,
      isLoading: isUnstakeFeesLoading,
      isSuccess: isUnstakeFeesSuccess,
    },
    isUnstakeTxPending,
    unstakeMutation: { mutateAsync: handleUnstake },
    newContractBalanceOfQuery: { isSuccess: isNewContractBalanceOfCryptoBaseUnitSuccess },
    userStakingBalanceOfQuery: { isSuccess: isUserStakingBalanceOfCryptoBaseUnitSuccess },
    newShareOfPoolPercentage,
  } = useRfoxUnstake({
    stakingAssetId: confirmedQuote.stakingAssetId,
    stakingAssetAccountId: confirmedQuote.stakingAssetAccountId,
    amountCryptoBaseUnit: confirmedQuote.unstakingAmountCryptoBaseUnit,
    methods: undefined,
    unstakeTxid,
    setUnstakeTxid,
  })

  const handleGoBack = useCallback(() => {
    history.push(UnstakeRoutePaths.Input)
  }, [history])

  const stakeCards = useMemo(() => {
    if (!stakingAsset) return null
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
        <AssetIcon size='sm' assetId={stakingAsset?.assetId} />
        <Stack textAlign='center' spacing={0}>
          <Amount.Crypto value={unstakingAmountCryptoPrecision} symbol={stakingAsset?.symbol} />
          <Amount.Fiat fontSize='sm' color='text.subtle' value={unstakingAmountUserCurrency} />
        </Stack>
      </Card>
    )
  }, [stakingAsset, unstakingAmountCryptoPrecision, unstakingAmountUserCurrency])

  const handleSubmit = useCallback(async () => {
    if (!stakingAsset) return

    await checkLedgerAppOpenIfLedgerConnected(stakingAsset.chainId)
      .then(async () => {
        await handleUnstake()
        history.push(UnstakeRoutePaths.Status)
      })
      .catch(console.error)
  }, [handleUnstake, history, stakingAsset, checkLedgerAppOpenIfLedgerConnected])

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
        <Stack spacing={6}>
          {stakeCards}
          <Timeline>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('RFOX.shapeShiftFee')}</Row.Label>
                <Row.Value>{translate('common.free')}</Row.Value>
              </CustomRow>
            </TimelineItem>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('RFOX.networkFee')}</Row.Label>
                <Row.Value>
                  <Skeleton isLoaded={!isUnstakeFeesLoading}>
                    <Row.Value>
                      <Amount.Fiat value={unstakeFees?.txFeeFiat ?? '0.0'} />
                    </Row.Value>
                  </Skeleton>
                </Row.Value>
              </CustomRow>
            </TimelineItem>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('RFOX.shareOfPool')}</Row.Label>
                <Row.Value>
                  <Skeleton
                    isLoaded={
                      isNewContractBalanceOfCryptoBaseUnitSuccess &&
                      isUserStakingBalanceOfCryptoBaseUnitSuccess
                    }
                  >
                    <Amount.Percent value={newShareOfPoolPercentage} />
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
          isLoading={isUnstakeFeesLoading || isUnstakeTxPending}
          disabled={Boolean(!isUnstakeFeesSuccess || isUnstakeTxPending)}
          onClick={handleSubmit}
        >
          {translate('RFOX.confirmAndUnstake')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
