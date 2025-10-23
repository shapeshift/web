import { Box, Center, HStack, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { TbArrowRight } from 'react-icons/tb'

import { TransferColumn } from './TransferColumn'

import type { Transfer } from '@/hooks/useTxDetails/useTxDetails'

type TransfersProps = {
  compactMode?: boolean
  transfers: Transfer[]
}

const stackSpacing = { base: 4, lg: 4 }

const TransferDivider = () => {
  return (
    <VStack alignItems='center' justifyContent='center' alignSelf='stretch' spacing={0}>
      <Box width='1px' height='100%' bg='border.base' />
      <Center
        flexShrink={0}
        boxSize={8}
        borderWidth={1}
        borderRadius='full'
        borderColor='border.base'
      >
        <TbArrowRight />
      </Center>
      <Box width='1px' height='100%' bg='border.base' />
    </VStack>
  )
}

const transferDivider = <TransferDivider />

export const Transfers = ({ compactMode, transfers }: TransfersProps) => {
  const stackPaddingY = useMemo(() => ({ base: 0, lg: compactMode ? 0 : 6 }), [compactMode])

  const flexBasis = useMemo(() => {
    if (transfers.length === 1) return '100%'
    if (transfers.length === 2) {
      // For 2 items: (100% - divider width) / 2
      // Divider is 32px (boxSize={8}), so we need to account for that
      return 'calc(50% - 16px)'
    }
    // For 3+ items: 50% width, they'll scroll
    return '50%'
  }, [transfers.length])

  return transfers.length > 0 ? (
    <HStack
      spacing={stackSpacing}
      py={stackPaddingY}
      flex={1}
      width='full'
      borderWidth={1}
      overflowX='auto'
      justifyContent={transfers.length === 1 ? 'center' : 'flex-start'}
      borderColor='border.base'
      divider={transferDivider}
      bg='background.surface.raised.base'
      borderRadius='2xl'
      boxShadow='sm'
    >
      {transfers.map((transfer, i) => {
        return (
          <Box key={i} flexBasis={flexBasis} flexShrink={0} minWidth='150px'>
            <TransferColumn compactMode={compactMode} {...transfer} />
          </Box>
        )
      })}
    </HStack>
  ) : null
}
