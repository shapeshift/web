import { ArrowBackIcon, ArrowForwardIcon } from '@chakra-ui/icons'
import { HStack, IconButton, Text, useColorModeValue } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback } from 'react'

interface Props {
  value: number
  max: number
  onChange(value: number): void
}

export const PageInput: FC<Props> = ({ value, max, onChange }) => {
  const nextPage = useCallback(() => onChange(value + 1), [onChange, value])
  const prevPage = useCallback(() => onChange(value - 1), [onChange, value])

  return (
    <HStack
      align='center'
      borderWidth={2}
      borderRadius='md'
      borderColor={useColorModeValue('blackAlpha.50', 'gray.750')}
    >
      <IconButton
        colorScheme='gray'
        aria-label='Previous Page'
        variant='ghost'
        icon={<ArrowBackIcon />}
        disabled={value <= 0}
        style={{ height: 36 }}
        onClick={prevPage}
      />
      <Text textAlign='center' minWidth={16}>
        {value + 1} of {max + 1}
      </Text>
      <IconButton
        aria-label='Next Page'
        variant='ghost'
        icon={<ArrowForwardIcon />}
        disabled={value >= max}
        style={{ height: 36 }}
        onClick={nextPage}
      />
    </HStack>
  )
}
