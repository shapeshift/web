import { InfoIcon } from '@chakra-ui/icons'
import {
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Tooltip,
} from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { RawText } from '@/components/Text'

const gridColumns = { base: 1, md: 2 }

export const Overview = () => {
  const translate = useTranslate()
  return (
    <Card>
      <CardHeader>
        <HStack>
          <AssetIcon assetId={ethAssetId} />
          <Amount.Crypto value='0' symbol='TCY' fontSize='2xl' />
        </HStack>
      </CardHeader>
      <CardBody pb={6}>
        <Heading size='sm' mb={6}>
          {translate('TCY.myPosition')}
        </Heading>
        <SimpleGrid spacing={6} columns={gridColumns}>
          <Flex flexDir='column'>
            <HelperTooltip label={translate('TCY.myStakedBalanceHelper', { symbol: 'TCY' })}>
              <RawText color='text.subtle'>{translate('TCY.myStakedBalance')}</RawText>
            </HelperTooltip>
            <Amount.Crypto value='0' symbol='TCY' fontSize='2xl' />
            <Amount.Fiat value={0} fontSize='sm' color='text.subtle' />
          </Flex>
          <Flex flexDir='column'>
            <HelperTooltip label={translate('TCY.timeStakedHelper', { symbol: 'TCY' })}>
              <RawText color='text.subtle'>{translate('TCY.timeStaked')}</RawText>
            </HelperTooltip>
            <RawText fontSize='2xl'>0 days</RawText>
          </Flex>
        </SimpleGrid>
      </CardBody>
    </Card>
  )
}
