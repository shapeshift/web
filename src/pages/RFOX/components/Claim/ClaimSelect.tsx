import { Box, CardBody, Flex, Stack } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { type FC } from 'react'
import { AssetIconWithBadge } from 'components/AssetIconWithBadge'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { TransactionTypeIcon } from 'components/TransactionHistory/TransactionTypeIcon'

import type { ClaimRouteProps } from './types'

type ClaimSelectProps = {
  assetSymbol: string
  amount: string
  status: string
}

const ClaimRow: FC<ClaimSelectProps> = ({ assetSymbol, amount, status }) => {
  return (
    <Flex align='center' p={4} borderRadius='md'>
      <Box mr={4}>
        <AssetIconWithBadge assetId={foxAssetId}>
          <TransactionTypeIcon type={TransferType.Receive} />
        </AssetIconWithBadge>
      </Box>
      <Box mr={4}>
        <RawText fontSize='sm' color='gray.400'>
          Unstake from r{assetSymbol}
        </RawText>
        <RawText fontSize='xl' fontWeight='bold' color='white'>
          {assetSymbol}
        </RawText>
      </Box>
      <Box flex='1' alignItems={'end'}>
        <RawText fontSize='sm' fontWeight='bold' color='green.300' align={'end'}>
          {status}
        </RawText>
        <RawText fontSize='xl' fontWeight='bold' color='white' align={'end'}>
          {amount} {assetSymbol}
        </RawText>
      </Box>
    </Flex>
  )
}

export const ClaimSelect: FC<ClaimRouteProps & ClaimSelectProps> = ({ headerComponent }) => {
  return (
    <SlideTransition>
      <Stack>{headerComponent}</Stack>
      <CardBody py={12}>
        <Flex flexDir='column' gap={4}>
          <ClaimRow assetSymbol={'FOX'} amount={'1,500'} status={'Available'} />
          <ClaimRow assetSymbol={'FOX'} amount={'200'} status={'Available'} />
        </Flex>
      </CardBody>
    </SlideTransition>
  )
}
