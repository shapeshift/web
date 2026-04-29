import { Box, SimpleGrid, Stack, Table, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react'

import type { AffiliateSwap } from '../../hooks/useAffiliateSwaps'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { formatDate, formatUsd } from '../../lib/format'
import { AssetPill } from './AssetPill'
import { StatusBadge } from './StatusBadge'
import { SwapperIcon } from './SwapperIcon/SwapperIcon'
import { TxLinks } from './TxLinks'
import { VerifiedBadge } from './VerifiedBadge'

interface SwapsTableProps {
  swaps: AffiliateSwap[]
}

const parseUsd = (v: string | null): number => parseFloat(v ?? '') || 0

const partnerBps = (swap: AffiliateSwap): number | null =>
  swap.affiliateBps == null ? null : Math.max(0, swap.affiliateBps - swap.shapeshiftBps)

const formatBps = (value: number | null): string => (value == null ? '—' : String(value))

const SwapRow = ({ swap }: { swap: AffiliateSwap }): React.JSX.Element => (
  <Tr>
    <Td color='fg.default' whiteSpace='nowrap'>
      {formatDate(swap.createdAt)}
    </Td>
    <Td color='fg.default' whiteSpace='nowrap'>
      <Box display='inline-flex' alignItems='center' gap={2}>
        <SwapperIcon swapperName={swap.swapperName} />
        {swap.swapperName}
      </Box>
    </Td>
    <Td>
      <AssetPill asset={swap.sellAsset} />
    </Td>
    <Td>
      <AssetPill asset={swap.buyAsset} />
    </Td>
    <Td isNumeric fontFamily='mono' color='fg.default' whiteSpace='nowrap'>
      {formatUsd(parseUsd(swap.sellAmountUsd))}
    </Td>
    <Td isNumeric fontFamily='mono' color='success' whiteSpace='nowrap'>
      {formatUsd(parseUsd(swap.affiliateFeeUsd))}
    </Td>
    <Td fontFamily='mono' color='fg.default' textAlign='center' px={2} width='1%'>
      {formatBps(partnerBps(swap))}
    </Td>
    <Td fontFamily='mono' color='fg.default' textAlign='center' px={2} width='1%'>
      {swap.shapeshiftBps}
    </Td>
    <Td width='1%'>
      <TxLinks swap={swap} />
    </Td>
    <Td textAlign='center' width='1%'>
      <VerifiedBadge isAffiliateVerified={swap.isAffiliateVerified} />
    </Td>
    <Td width='1%'>
      <StatusBadge status={swap.status} />
    </Td>
  </Tr>
)

const Stat = ({
  label,
  value,
  align = 'left',
  color = 'fg.default',
}: {
  label: string
  value: React.ReactNode
  align?: 'left' | 'right'
  color?: string
}): React.JSX.Element => (
  <Box textAlign={align}>
    <Text fontSize='xs' color='fg.muted'>
      {label}
    </Text>
    <Text fontFamily='mono' fontSize='sm' color={color}>
      {value}
    </Text>
  </Box>
)

const SwapCard = ({ swap }: { swap: AffiliateSwap }): React.JSX.Element => (
  <Box bg='bg.surface' border='1px solid' borderColor='border.subtle' borderRadius='xl' p={4}>
    <Stack spacing={3}>
      <Box display='flex' justifyContent='space-between' alignItems='center' gap={2}>
        <Text fontSize='xs' color='fg.muted' textTransform='uppercase' letterSpacing='0.06em'>
          {formatDate(swap.createdAt)} · {swap.swapperName}
        </Text>
        <Box display='flex' gap={2} alignItems='center'>
          <VerifiedBadge isAffiliateVerified={swap.isAffiliateVerified} />
          <StatusBadge status={swap.status} />
        </Box>
      </Box>

      <Box display='flex' gap={2} alignItems='center' flexWrap='wrap'>
        <AssetPill asset={swap.sellAsset} />
        <Text color='fg.muted' fontSize='sm'>
          →
        </Text>
        <AssetPill asset={swap.buyAsset} />
      </Box>

      <SimpleGrid columns={2} spacing={3}>
        <Stat label='Volume' value={formatUsd(parseUsd(swap.sellAmountUsd))} />
        <Stat
          label='Fee'
          value={formatUsd(parseUsd(swap.affiliateFeeUsd))}
          align='right'
          color='success'
        />
        <Stat label='ShapeShift BPS' value={swap.shapeshiftBps} />
        <Stat label='Partner BPS' value={formatBps(partnerBps(swap))} align='right' />
      </SimpleGrid>

      <Box>
        <Text fontSize='xs' color='fg.muted' mb={1.5}>
          Transactions
        </Text>
        <TxLinks swap={swap} />
      </Box>
    </Stack>
  </Box>
)

export const SwapsTable = ({ swaps }: SwapsTableProps): React.JSX.Element => {
  const isCardLayout = !useMediaQuery('(min-width: 80em)')

  if (isCardLayout) {
    return (
      <Stack spacing={3} mb={4}>
        {swaps.map(swap => (
          <SwapCard key={swap.swapId} swap={swap} />
        ))}
      </Stack>
    )
  }

  return (
    <Table
      variant='simple'
      size='md'
      sx={{
        tableLayout: 'auto',
        '& thead th': {
          position: 'sticky',
          top: 0,
          zIndex: 1,
          bg: 'bg.surface',
          py: 4,
          px: 4,
        },
        '& tbody td': { py: 4, px: 4, fontSize: 'md' },
        '& thead th:first-of-type, & tbody td:first-of-type': { pl: 8 },
        '& thead th:last-of-type, & tbody td:last-of-type': { pr: 8 },
      }}
    >
      <Thead>
        <Tr>
          <Th borderColor='border.subtle' width='1%'>
            Date
          </Th>
          <Th borderColor='border.subtle'>Swapper</Th>
          <Th borderColor='border.subtle'>Sell</Th>
          <Th borderColor='border.subtle'>Buy</Th>
          <Th borderColor='border.subtle' textAlign='center'>
            Volume
          </Th>
          <Th borderColor='border.subtle' textAlign='center'>
            Fee
          </Th>
          <Th borderColor='border.subtle' textAlign='center' px={2} width='1%'>
            Partner BPS
          </Th>
          <Th borderColor='border.subtle' textAlign='center' px={2} width='1%'>
            ShapeShift BPS
          </Th>
          <Th borderColor='border.subtle' textAlign='center' width='1%'>
            Transactions
          </Th>
          <Th borderColor='border.subtle' textAlign='center' width='1%'>
            Verified
          </Th>
          <Th borderColor='border.subtle' width='1%'>
            Status
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {swaps.map(swap => (
          <SwapRow key={swap.swapId} swap={swap} />
        ))}
      </Tbody>
    </Table>
  )
}
