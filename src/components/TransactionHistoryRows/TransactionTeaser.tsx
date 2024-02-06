import { Flex, Stack } from '@chakra-ui/react'
import type { TransferType } from '@shapeshiftoss/unchained-client'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { AssetIconWithBadge } from 'components/AssetIconWithBadge'
import { TransactionTypeIcon } from 'components/TransactionHistory/TransactionTypeIcon'
import type { Transfer } from 'hooks/useTxDetails/useTxDetails'

type TransactionTeaserProps = {
  transfersByType: Record<TransferType, Transfer[]>
  type: string
  topLeftRegion?: JSX.Element
  topRightRegion?: JSX.Element
  bottomLeftRegion?: JSX.Element
  bottomRightRegion?: JSX.Element
  status: TxStatus
  onToggle: () => void
}

const overFlowText = { p: { maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis' } }

export const TransactionTeaser: React.FC<TransactionTeaserProps> = ({
  transfersByType,
  type,
  topLeftRegion,
  topRightRegion,
  bottomLeftRegion,
  bottomRightRegion,
  status,
  onToggle,
}) => {
  return (
    <Flex gap={4} alignItems='center' px={4} py={4} onClick={onToggle} cursor='pointer'>
      <AssetIconWithBadge
        transfersByType={transfersByType}
        type={type}
        isLoading={status === TxStatus.Pending}
      >
        <TransactionTypeIcon type={type} status={status} />
      </AssetIconWithBadge>
      <Stack flex={1} spacing={0}>
        <Flex
          lineHeight='shorter'
          color='text.subtle'
          justifyContent='space-between'
          alignItems='center'
        >
          {topLeftRegion}
          {topRightRegion}
        </Flex>
        <Flex fontSize='lg' fontWeight='bold' justifyContent='space-between' alignItems='center'>
          {bottomLeftRegion && (
            <Flex whiteSpace='nowrap' sx={overFlowText}>
              {bottomLeftRegion}
            </Flex>
          )}
          {bottomRightRegion}
        </Flex>
      </Stack>
    </Flex>
  )
}
