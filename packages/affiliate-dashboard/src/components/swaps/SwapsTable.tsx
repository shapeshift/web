import {
  Box,
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

interface SwapsTableProps {
  swaps: AffiliateSwap[]
}

const parseNum = (v: string | null): number => parseFloat(v ?? '') || 0
const parseBpsDisplay = (bps: string | null): number => Math.max(0, parseInt(bps ?? '0', 10) - 10)

const SwapRow = ({ swap }: { swap: AffiliateSwap }): React.JSX.Element => (
  <Tr _hover={{ bg: 'bg.raised' }} transition='background 120ms ease'>
    <Td color='fg.default' whiteSpace='nowrap'>
      {formatDate(swap.createdAt)}
    </Td>
    <Td>
      <AssetPill asset={swap.sellAsset} />
    </Td>
    <Td>
      <AssetPill asset={swap.buyAsset} />
    </Td>
    <Td isNumeric fontFamily='mono' color='fg.default' whiteSpace='nowrap'>
      {formatUsd(parseNum(swap.sellAmountUsd))}
    </Td>
    <Td isNumeric fontFamily='mono' color='success' whiteSpace='nowrap'>
      {formatUsd(parseNum(swap.affiliateFeeUsd))}
    </Td>
    <Td isNumeric fontFamily='mono' color='fg.default'>
      {parseBpsDisplay(swap.affiliateBps)}
    </Td>
    <Td>
      <StatusBadge status={swap.status} />
    </Td>
  </Tr>
)

const MobileSwapCard = ({ swap }: { swap: AffiliateSwap }): React.JSX.Element => (
  <Box bg='bg.surface' border='1px solid' borderColor='border.subtle' borderRadius='xl' p={4}>
    <Stack spacing={3}>
      <Box display='flex' justifyContent='space-between' alignItems='center'>
        <Text fontSize='xs' color='fg.muted' textTransform='uppercase' letterSpacing='0.06em'>
          {formatDate(swap.createdAt)}
        </Text>
        <StatusBadge status={swap.status} />
      </Box>
      <Box display='flex' gap={2} alignItems='center'>
        <AssetPill asset={swap.sellAsset} />
        <Text color='fg.muted' fontSize='sm'>
          →
        </Text>
        <AssetPill asset={swap.buyAsset} />
      </Box>
      <Box display='flex' justifyContent='space-between'>
        <Box>
          <Text fontSize='xs' color='fg.muted'>
            Volume
          </Text>
          <Text fontFamily='mono' fontSize='sm' color='fg.default'>
            {formatUsd(parseNum(swap.sellAmountUsd))}
          </Text>
        </Box>
        <Box textAlign='right'>
          <Text fontSize='xs' color='fg.muted'>
            Fee ({parseBpsDisplay(swap.affiliateBps)} bps)
          </Text>
          <Text fontFamily='mono' fontSize='sm' color='success'>
            {formatUsd(parseNum(swap.affiliateFeeUsd))}
          </Text>
        </Box>
      </Box>
    </Stack>
  </Box>
)

export const SwapsTable = ({ swaps }: SwapsTableProps): React.JSX.Element => {
  const isMobile = useBreakpointValue({ base: true, md: false })

  if (isMobile) {
    return (
      <Stack spacing={3} mb={4}>
        {swaps.map(swap => (
          <MobileSwapCard key={swap.id} swap={swap} />
        ))}
      </Stack>
    )
  }

  return (
    <TableContainer
      border='1px solid'
      borderColor='border.subtle'
      borderRadius='xl'
      mb={4}
      overflowX='auto'
    >
      <Table variant='simple' size='sm'>
        <Thead bg='bg.surface'>
          <Tr>
            <Th borderColor='border.subtle'>Date</Th>
            <Th borderColor='border.subtle'>Sell</Th>
            <Th borderColor='border.subtle'>Buy</Th>
            <Th borderColor='border.subtle' isNumeric>
              Volume
            </Th>
            <Th borderColor='border.subtle' isNumeric>
              Fee
            </Th>
            <Th borderColor='border.subtle' isNumeric>
              BPS
            </Th>
            <Th borderColor='border.subtle'>Status</Th>
          </Tr>
        </Thead>
        <Tbody>
          {swaps.map(swap => (
            <SwapRow key={swap.id} swap={swap} />
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  )
}
