import { Box, HStack, IconButton, useColorModeValue, useToast } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { FaChevronRight } from 'react-icons/fa'
import { FiCopy } from 'react-icons/fi'
import { useTranslate } from 'react-polyglot'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { useToggle } from '@/hooks/useToggle/useToggle'

type ExpandableCellProps = {
  value: string
  threshold?: number
}

const fiCopy = <FiCopy />

export const ExpandableCell: React.FC<ExpandableCellProps> = ({ value, threshold = 30 }) => {
  const [isExpanded, toggleExpanded] = useToggle(false)
  const translate = useTranslate()
  const toast = useToast()

  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const hoverBorderColor = useColorModeValue('gray.300', 'gray.500')
  const chevronColor = useColorModeValue('gray.500', 'gray.400')
  const expandedTextColor = useColorModeValue('gray.600', 'gray.400')

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast({
        title: translate('common.copied'),
        status: 'success',
        duration: 2500,
        isClosable: true,
      })
    } catch (e) {
      toast({
        title: translate('common.copyFailed'),
        description: translate('common.copyFailedDescription'),
        status: 'error',
        duration: 2500,
        isClosable: true,
      })
    }
  }, [value, toast, translate])

  const iconButton = useMemo(
    () => (
      <IconButton
        aria-label={translate('common.copy')}
        icon={fiCopy}
        size='xs'
        variant='ghost'
        onClick={handleCopy}
        color='text.subtle'
      />
    ),
    [translate, handleCopy],
  )

  const containerProps = useMemo(
    () => ({ spacing: 2, align: 'center' as const, justify: 'flex-end' as const }),
    [],
  )

  const hoverSx = useMemo(() => ({ borderColor: hoverBorderColor }), [hoverBorderColor])
  const chevronIconSx = { boxSize: '10px', color: chevronColor }
  const expandedChevronSx = {
    boxSize: '10px',
    transform: 'rotate(90deg)',
    color: chevronColor,
  }
  const expandedTextSx = {
    fontSize: 'xs',
    fontFamily: 'mono',
    wordBreak: 'break-all' as const,
    color: expandedTextColor,
    pl: 4,
    py: 2,
    mt: 1,
    maxW: '100%',
    textAlign: 'right' as const,
  }

  if (value.length <= threshold) {
    return (
      <HStack {...containerProps}>
        <Box fontSize='sm' fontWeight='bold' textAlign='right'>
          {value}
        </Box>
        {iconButton}
      </HStack>
    )
  }

  if (!isExpanded) {
    return (
      <HStack {...containerProps}>
        <HStack
          spacing={2}
          align='center'
          borderWidth={1}
          borderColor={borderColor}
          borderRadius='md'
          px={2}
          py={1}
          cursor='pointer'
          onClick={toggleExpanded}
          _hover={hoverSx}
        >
          <MiddleEllipsis value={value} fontSize='sm' />
          <Box as={FaChevronRight} {...chevronIconSx} />
        </HStack>
        {iconButton}
      </HStack>
    )
  }

  return (
    <Box display='flex' flexDirection='column' alignItems='flex-end'>
      <HStack {...containerProps}>
        <HStack
          spacing={2}
          align='center'
          borderWidth={1}
          borderColor={borderColor}
          borderRadius='md'
          px={2}
          py={1}
          cursor='pointer'
          onClick={toggleExpanded}
          _hover={hoverSx}
        >
          <MiddleEllipsis value={value} fontSize='sm' />
          <Box as={FaChevronRight} {...expandedChevronSx} />
        </HStack>
        {iconButton}
      </HStack>
      <Box {...expandedTextSx}>{value}</Box>
    </Box>
  )
}
