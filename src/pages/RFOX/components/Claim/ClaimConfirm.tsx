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
import { type FC, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Row, type RowProps } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Timeline, TimelineItem } from 'components/Timeline/Timeline'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ClaimRoutePaths, type ClaimRouteProps, type RfoxClaimQuote } from './types'

type ClaimConfirmProps = {
  claimQuote: RfoxClaimQuote
  setClaimTxid: (txId: string) => void
}

const backIcon = <ArrowBackIcon />

const CustomRow: React.FC<RowProps> = props => <Row fontSize='sm' fontWeight='medium' {...props} />

export const ClaimConfirm: FC<ClaimRouteProps & ClaimConfirmProps> = ({
  claimQuote,
  setClaimTxid,
}) => {
  const history = useHistory()
  const translate = useTranslate()

  const handleGoBack = useCallback(() => {
    history.push(ClaimRoutePaths.Select)
  }, [history])

  const claimAsset = useAppSelector(state => selectAssetById(state, claimQuote.claimAssetId))
  const claimAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(claimQuote.claimAmountCryptoBaseUnit, claimAsset?.precision ?? 0),
    [claimQuote.claimAmountCryptoBaseUnit, claimAsset?.precision],
  )

  const claimCard = useMemo(() => {
    if (!claimAsset) return null
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
        <AssetIcon size='sm' assetId={claimAsset?.assetId} />
        <Stack textAlign='center' spacing={0}>
          <Amount.Crypto value={claimAmountCryptoPrecision} symbol={claimAsset?.symbol} />
          <Amount.Fiat fontSize='sm' color='text.subtle' value='10.22' />
        </Stack>
      </Card>
    )
  }, [claimAsset, claimAmountCryptoPrecision])

  const handleSubmit = useCallback(() => {
    setClaimTxid('1234')
    history.push(ClaimRoutePaths.Status)
  }, [history, setClaimTxid])

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
          {claimCard}
          <Timeline>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('RFOX.claimReceiveAddress')}</Row.Label>
                <Row.Value>0xSomething</Row.Value>
              </CustomRow>
            </TimelineItem>
            <TimelineItem>
              <CustomRow>
                <Row.Label>{translate('RFOX.networkFee')}</Row.Label>
                <Row.Value>
                  <Skeleton isLoaded={true}>
                    <Row.Value>
                      <Amount.Fiat value={'1.23'} />
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
          isLoading={false}
          disabled={false}
          onClick={handleSubmit}
        >
          {translate('RFOX.confirmAndClaim')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
