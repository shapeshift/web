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
import { foxAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import type { RowProps } from 'components/Row/Row'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { Timeline, TimelineItem } from 'components/Timeline/Timeline'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StakeRoutePaths, type StakeRouteProps } from './types'

const backIcon = <ArrowBackIcon />

const CustomRow: React.FC<RowProps> = props => <Row fontSize='sm' fontWeight='medium' {...props} />

type StakeConfirmProps = {
  runeAddress: string
}
export const StakeConfirm: React.FC<StakeConfirmProps & StakeRouteProps> = ({ runeAddress }) => {
  const history = useHistory()
  const translate = useTranslate()
  const asset = useAppSelector(state => selectAssetById(state, foxAssetId))

  const handleGoBack = useCallback(() => {
    history.push(StakeRoutePaths.Input)
  }, [history])

  const handleSubmit = useCallback(() => {
    history.push(StakeRoutePaths.Status)
  }, [history])

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
          <Row.Value>
            <MiddleEllipsis value={runeAddress} />
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
        <Button size='lg' mx={-2} colorScheme='blue' onClick={handleSubmit}>
          {translate('RFOX.confirmAndStake')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
