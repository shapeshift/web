import { Box, Button, Flex, Tooltip } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { TransferType } from '@shapeshiftoss/unchained-client'
import { Amount } from 'components/Amount/Amount'
import { AssetIconWithBadge } from 'components/AssetIconWithBadge'
import { RawText } from 'components/Text'
import { TransactionTypeIcon } from 'components/TransactionHistory/TransactionTypeIcon'

import { ClaimStatus } from './types'

const hoverProps = { bg: 'gray.700', cursor: 'default' }
const disabledProps = { opacity: 1, cursor: 'default' }

export type ClaimRowProps = {
  actionText: string | undefined
  amountCryptoPrecision: string
  asset: Asset
  status: ClaimStatus
  statusText: string
  tooltipText?: string
  onClaimClick?: () => void
}

export const ClaimRow = ({
  actionText,
  amountCryptoPrecision,
  asset,
  status,
  statusText,
  tooltipText,
  onClaimClick,
}: ClaimRowProps) => {
  return (
    <Tooltip label={tooltipText}>
      <Flex
        justifyContent='space-between'
        align='center'
        p={2}
        borderRadius='md'
        height='auto'
        width='100%'
        variant='unstyled'
        as={Button}
        isDisabled={onClaimClick === undefined || status !== ClaimStatus.Available}
        onClick={onClaimClick}
        _hover={hoverProps}
        _disabled={disabledProps}
      >
        <Flex>
          <Flex alignItems='center' mr={4}>
            <AssetIconWithBadge assetId={asset.assetId}>
              <TransactionTypeIcon type={TransferType.Receive} />
            </AssetIconWithBadge>
          </Flex>
          <Box mr={4}>
            {actionText && (
              <RawText fontSize='sm' color='gray.400' align='start'>
                {actionText}
              </RawText>
            )}
            <RawText fontSize='xl' fontWeight='bold' color='white' align='start'>
              {asset.symbol}
            </RawText>
          </Box>
        </Flex>
        <Flex justifyContent='flex-end' alignItems='center'>
          <Box flexGrow={1} alignItems='end'>
            <RawText
              fontSize='sm'
              fontWeight='bold'
              color={status === ClaimStatus.Available ? 'green.300' : 'yellow.300'}
              align='end'
            >
              {statusText}
            </RawText>
            <RawText fontSize='xl' fontWeight='bold' color='white' align='end'>
              <Amount.Crypto value={amountCryptoPrecision} symbol={asset.symbol ?? ''} />
            </RawText>
          </Box>
        </Flex>
      </Flex>
    </Tooltip>
  )
}
