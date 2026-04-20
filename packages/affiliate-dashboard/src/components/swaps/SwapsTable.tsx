import {
  Box,
  SimpleGrid,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useBreakpointValue,
} from '@chakra-ui/react'

import type { AffiliateSwap } from '../../hooks/useAffiliateSwaps'
import { formatDate, formatUsd } from '../../lib/format'
import { AssetPill } from './AssetPill'
import { StatusBadge } from './StatusBadge'
import { TxLinks } from './TxLinks'
import { VerifiedBadge } from './VerifiedBadge'

interface SwapsTableProps {
  swaps: AffiliateSwap[]
}

const parseUsd = (v: string | null): number => parseFloat(v ?? '') || 0

const partnerBps = (swap: AffiliateSwap): number =>
  Math.max(0, (swap.affiliateBps ?? 0) - swap.shapeshiftBps)

const SwapRow = ({ swap }: { swap: AffiliateSwap }): React.JSX.Element => (
  <Tr _hover={{ bg: 'bg.raised' }} transition='background 120ms ease'>
    <Td color='fg.default' whiteSpace='nowrap'>
      {formatDate(swap.createdAt)}
    </Td>
    <Td color='fg.default' whiteSpace='nowrap'>
      {swap.swapperName}
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
    <Td fontFamily='mono' color='fg.default' textAlign='center'>
      {partnerBps(swap)}
    </Td>
    <Td fontFamily='mono' color='fg.default' textAlign='center'>
      {swap.shapeshiftBps}
    </Td>
    <Td>
      <TxLinks swap={swap} />
    </Td>
    <Td textAlign='center'>
      <VerifiedBadge isAffiliateVerified={swap.isAffiliateVerified} />
    </Td>
    <Td>
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
        <Stat label='Partner BPS' value={partnerBps(swap)} align='right' />
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
  // Full table only when there's enough width for all 11 columns comfortably.
  // Otherwise use the card layout — it shows everything, just stacked.
  const useCardLayout = useBreakpointValue({ base: true, xl: false })

  if (useCardLayout) {
    return (
      <Stack spacing={3} mb={4}>
        {swaps.map(swap => (
          <SwapCard key={swap.swapId} swap={swap} />
        ))}
      </Stack>
    )
  }

  return (
    <TableContainer border='1px solid' borderColor='border.subtle' borderRadius='xl' mb={4}>
      <Table variant='simple' size='sm' sx={{ tableLayout: 'auto' }}>
        <Thead bg='bg.surface'>
          <Tr>
            <Th borderColor='border.subtle'>Date</Th>
            <Th borderColor='border.subtle'>Swapper</Th>
            <Th borderColor='border.subtle'>Sell</Th>
            <Th borderColor='border.subtle'>Buy</Th>
            <Th borderColor='border.subtle' isNumeric>
              Volume
            </Th>
            <Th borderColor='border.subtle' isNumeric>
              Fee
            </Th>
            <Th borderColor='border.subtle' textAlign='center'>
              Partner BPS
            </Th>
            <Th borderColor='border.subtle' textAlign='center'>
              ShapeShift BPS
            </Th>
            <Th borderColor='border.subtle'>Tx</Th>
            <Th borderColor='border.subtle' textAlign='center'>
              Verified
            </Th>
            <Th borderColor='border.subtle'>Status</Th>
          </Tr>
        </Thead>
        <Tbody>
          {swaps.map(swap => (
            <SwapRow key={swap.swapId} swap={swap} />
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  )
}
