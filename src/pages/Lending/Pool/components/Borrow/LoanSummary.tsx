import { ArrowForwardIcon } from '@chakra-ui/icons'
import type { StackProps } from '@chakra-ui/react'
import { Collapse, Skeleton, Stack } from '@chakra-ui/react'
import React from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { RawText } from 'components/Text'

const FromToStack: React.FC<StackProps> = props => (
  <Stack
    alignItems='center'
    direction='row'
    fontWeight='medium'
    spacing={1}
    divider={<ArrowForwardIcon color='text.subtle' borderLeft={0} />}
    {...props}
  />
)

type LoanSummaryProps = {
  isLoading?: boolean
  show?: boolean
}

export const LoanSummary: React.FC<LoanSummaryProps> = ({ isLoading, show }) => {
  const translate = useTranslate()
  return (
    <Collapse in={show}>
      <Stack
        fontSize='sm'
        px={6}
        py={4}
        spacing={4}
        fontWeight='medium'
        borderTopWidth={1}
        borderColor='border.subtle'
        mt={2}
      >
        <RawText fontWeight='bold'>{translate('lending.loanInformation')}</RawText>
        <Row>
          <HelperTooltip label='TBD'>
            <Row.Label>{translate('lending.collateral')}</Row.Label>
          </HelperTooltip>
          <Row.Value>
            <Skeleton isLoaded={!isLoading}>
              <FromToStack>
                <Amount.Crypto color='text.subtle' value='0' symbol='BTC' />
                <Amount.Crypto value='1.0' symbol='BTC' />
              </FromToStack>
            </Skeleton>
          </Row.Value>
        </Row>
        <Row>
          <HelperTooltip label='TBD'>
            <Row.Label>{translate('lending.debt')}</Row.Label>
          </HelperTooltip>
          <Row.Value>
            <Skeleton isLoaded={!isLoading}>
              <FromToStack>
                <Amount.Fiat color='text.subtle' value='0' />
                <Amount.Fiat value='14820' />
              </FromToStack>
            </Skeleton>
          </Row.Value>
        </Row>
        <Row>
          <HelperTooltip label='TBD'>
            <Row.Label>{translate('lending.repaymentLock')}</Row.Label>
          </HelperTooltip>
          <Row.Value>
            <Skeleton isLoaded={!isLoading}>
              <FromToStack>
                <RawText color='text.subtle'>25 days</RawText>
                <RawText>30 days</RawText>
              </FromToStack>
            </Skeleton>
          </Row.Value>
        </Row>
        <Row>
          <HelperTooltip label='TBD'>
            <Row.Label>{translate('lending.collateralizationRatio')}</Row.Label>
          </HelperTooltip>
          <Row.Value>
            <Skeleton isLoaded={!isLoading}>
              <Amount.Percent value='2.93' color='text.success' />
            </Skeleton>
          </Row.Value>
        </Row>
        <Row>
          <HelperTooltip label='TBD'>
            <Row.Label>{translate('lending.poolDepth')}</Row.Label>
          </HelperTooltip>
          <Row.Value>
            <Skeleton isLoaded={!isLoading}>
              <RawText color='text.success'>{translate('lending.healthy')}</RawText>
            </Skeleton>
          </Row.Value>
        </Row>
      </Stack>
    </Collapse>
  )
}
