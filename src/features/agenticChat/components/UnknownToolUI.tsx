import { Box, Code, Text, useColorModeValue } from '@chakra-ui/react'
import { getToolOrDynamicToolName } from 'ai'
import { memo } from 'react'

import type { ToolUIProps } from '../types/toolInvocation'

export const UnknownToolUI = memo(({ toolPart }: ToolUIProps) => {
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const bgColor = useColorModeValue('gray.50', 'gray.800')

  const toolName = getToolOrDynamicToolName(toolPart)

  return (
    <Box borderWidth={1} borderColor={borderColor} borderRadius='md' p={3} bg={bgColor} mt={2}>
      <Text fontSize='sm' fontWeight='medium' mb={2}>
        Unknown Tool
      </Text>
      <Code fontSize='xs'>{toolName}</Code>
    </Box>
  )
})

UnknownToolUI.displayName = 'UnknownToolUI'
