import { Flex, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { useMemo, useRef } from 'react'
import { AssetIconWithBadge } from 'components/AssetIconWithBadge'
import { TransactionTypeIcon } from 'components/TransactionHistory/TransactionTypeIcon'
import { useIsOverflow } from 'hooks/useIsOverflow'
import type { Transfer } from 'hooks/useTxDetails/useTxDetails'

type TransactionTeaserProps = {
  assetId?: AssetId
  transfersByType: Record<TransferType, Transfer[]>
  type: string
  topLeftRegion?: JSX.Element
  topRightRegion?: JSX.Element
  bottomLeftRegion?: JSX.Element
  bottomRightRegion?: JSX.Element
  status: TxStatus
  onToggle?: () => void
}

const overFlowStyle = {
  MaskImage: 'linear-gradient(to left, #0000 8%, #000 75%)',
  MaskPosition: 'right',
  WebkitMaskImage: 'linear-gradient(to left, #0000 8%, #000 75%)',
  WebkitMaskPosition: 'right',
}

const leftTextStyle = {
  flex: '0 1 auto',
  overflow: 'hidden',
  minWidth: 0,
  order: 1,
  whiteSpace: 'nowrap',
}
const rightTextStyle = {
  order: 2,
  flex: '1 0 auto',
  justifyContent: 'flex-end',
}

export const TransactionTeaser: React.FC<TransactionTeaserProps> = ({
  assetId,
  transfersByType,
  type,
  topLeftRegion,
  topRightRegion,
  bottomLeftRegion,
  bottomRightRegion,
  status,
  onToggle,
}) => {
  const leftTopContentRef = useRef<HTMLDivElement>(null)
  const leftBottomContentRef = useRef<HTMLDivElement>(null)
  const isLeftTopOverflowing = useIsOverflow(leftTopContentRef)
  const isLeftBottomOverflowing = useIsOverflow(leftBottomContentRef)

  const leftTopStyle = useMemo(
    () => (isLeftTopOverflowing ? { ...leftTextStyle, ...overFlowStyle } : leftTextStyle),
    [isLeftTopOverflowing],
  )
  const bottomLeftStyle = useMemo(
    () => (isLeftBottomOverflowing ? { ...leftTextStyle, ...overFlowStyle } : leftTextStyle),
    [isLeftBottomOverflowing],
  )

  return (
    <Flex gap={4} alignItems='center' px={4} py={4} onClick={onToggle}>
      <AssetIconWithBadge transfersByType={transfersByType} type={type} assetId={assetId}>
        <TransactionTypeIcon type={type} status={status} />
      </AssetIconWithBadge>
      <Stack flex={1} spacing={0} minWidth={0}>
        <Flex
          lineHeight='shorter'
          color='text.subtle'
          justifyContent='space-between'
          alignItems='center'
          minWidth={0}
          gap={2}
        >
          <Flex ref={leftTopContentRef} sx={leftTopStyle}>
            {topLeftRegion}
          </Flex>
          {topRightRegion && <Flex style={rightTextStyle}>{topRightRegion}</Flex>}
        </Flex>
        <Flex
          minWidth={0}
          fontSize='lg'
          fontWeight='bold'
          justifyContent='space-between'
          alignItems='center'
          gap={2}
        >
          {bottomLeftRegion && (
            <Flex ref={leftBottomContentRef} sx={bottomLeftStyle}>
              {bottomLeftRegion}
            </Flex>
          )}
          <Flex style={rightTextStyle}>{bottomRightRegion}</Flex>
        </Flex>
      </Stack>
    </Flex>
  )
}
