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
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { RowProps } from 'components/Row/Row'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Timeline, TimelineItem } from 'components/Timeline/Timeline'
import { middleEllipsis } from 'lib/utils'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { RfoxChangeAddressQuote } from './types'
import { ChangeAddressRoutePaths, type ChangeAddressRouteProps } from './types'

const CustomRow: React.FC<RowProps> = props => <Row fontSize='sm' fontWeight='medium' {...props} />
const backIcon = <ArrowBackIcon />

type ChangeAddressConfirmProps = {
  confirmedQuote: RfoxChangeAddressQuote
}

export const ChangeAddressConfirm: React.FC<
  ChangeAddressRouteProps & ChangeAddressConfirmProps
> = ({ confirmedQuote }) => {
  const history = useHistory()
  const translate = useTranslate()
  const stakingAsset = useAppSelector(state =>
    selectAssetById(state, confirmedQuote.stakingAssetId),
  )

  const handleGoBack = useCallback(() => {
    history.push(ChangeAddressRoutePaths.Input)
  }, [history])

  const handleSubmit = useCallback(() => {
    history.push(ChangeAddressRoutePaths.Status)
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
        <AssetIcon size='sm' assetId={stakingAsset.assetId} />
        <Stack textAlign='center' spacing={0}>
          <Amount.Crypto value='0.0' symbol={stakingAsset.symbol} />
          <Amount.Fiat fontSize='sm' color='text.subtle' value='0.0' />
        </Stack>
      </Card>
    )
  }, [stakingAsset])

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
                <Row.Label>{translate('RFOX.networkFee')}</Row.Label>
                <Row.Value>
                  <Amount.Fiat value='0.0001' />
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
          <Row.Value>{middleEllipsis('123455667765')}</Row.Value>
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
        <Button size='lg' mx={-2} colorScheme='blue' onClick={handleSubmit}>
          {translate('RFOX.confirmAndStake')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
