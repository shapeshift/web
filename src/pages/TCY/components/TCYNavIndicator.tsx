import type { ResponsiveValue } from '@chakra-ui/react'
import { Box, Center } from '@chakra-ui/react'
import type { Property } from 'csstype'
import { motion } from 'framer-motion'
import { useMemo } from 'react'

import { useTCYClaims } from '../queries/useTcyClaims'

const position: ResponsiveValue<Property.Position> = { base: 'absolute', '2xl': 'relative' }
const right = { base: -1, '2xl': 'auto' }
const top = { base: -1, '2xl': 'auto' }

export const TCYNavIndicator = () => {
  const claimsQuery = useTCYClaims('all')
  const hasClaims = useMemo(() => claimsQuery.some(query => query.data.length), [claimsQuery])

  if (!hasClaims) return null

  return (
    <Box
      ml='auto'
      position={position}
      left={right}
      top={top}
      h='16px'
      w='16px'
      display='flex'
      alignItems='center'
      justifyContent='center'
    >
      <Center boxSize='8px' bg='green.500' borderRadius='full' zIndex={1} />

      <motion.div
        style={{
          position: 'absolute',
          width: '8px',
          height: '8px',
          borderRadius: '100%',
          border: '2px solid',
          borderColor: 'var(--chakra-colors-green-500)',
          zIndex: 0,
        }}
        animate={{
          scale: [1, 2.5],
          opacity: [1, 0],
        }}
        transition={{
          duration: 1.5,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatDelay: 0.5,
        }}
      />
    </Box>
  )
}
