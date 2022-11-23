import { Box } from '@chakra-ui/react'
import React from 'react'

import type { ArrowProps } from './types'

const baseArrowStyle: React.CSSProperties = {
  position: 'absolute',
  width: '50px',
  height: '50px',
  backgroundColor: 'rgba(0,0,0,0.5)',
  top: '50%',
  transform: 'translateY(-50%)',
  borderRadius: '50%',
  color: '#fff',
  fontSize: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}

export const Arrow = ({ left = false, children, onClick }: ArrowProps) => (
  <Box
    onClick={onClick}
    style={{
      ...baseArrowStyle,
      left: left ? '20px' : 'initial',
      right: !left ? '10px' : 'initial',
    }}
  >
    {children}
  </Box>
)
