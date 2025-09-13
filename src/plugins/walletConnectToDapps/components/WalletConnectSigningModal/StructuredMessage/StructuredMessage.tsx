import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import { Box, Button, HStack, Image, Skeleton, VStack } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { useMemo } from 'react'
import { isAddress } from 'viem'

import { ExpandableCell } from './ExpandableCell'

import { RawText } from '@/components/Text'
import { useToggle } from '@/hooks/useToggle/useToggle'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type StructuredField = {
  key: string
  // i.e actually any of solc types casted to TS
  value: unknown
  children?: StructuredField[]
  level?: number
}

type StructuredFieldProps = {
  field: StructuredField
  chainId: ChainId
}

const StructuredFieldComponent: FC<StructuredFieldProps> = ({ field, chainId }) => {
  const { key, value, children } = field
  const level = field.level ?? 0
  const [isExpanded, toggleExpanded] = useToggle(false)

  const maybeAssetId = useMemo(() => {
    if (typeof value !== 'string' || !isAddress(value)) return null

    try {
      return toAssetId({
        chainId,
        assetNamespace: 'erc20',
        assetReference: value,
      })
    } catch {
      return null
    }
  }, [value, chainId])

  const asset = useAppSelector(state =>
    maybeAssetId ? selectAssetById(state, maybeAssetId) : null,
  )

  const paddingLeft = level > 0 ? 4 : 0

  const hoverStyle = useMemo(() => ({ bg: 'whiteAlpha.50' }), [])

  const childrenWithLevel = useMemo(() => {
    return children?.map(child => ({ ...child, level: level + 1 })) || []
  }, [children, level])

  if (children?.length) {
    return (
      <Box py={1}>
        <Button
          variant='ghost'
          size='sm'
          pl={paddingLeft}
          pr={2}
          py={1}
          h='auto'
          fontWeight='normal'
          justifyContent='space-between'
          onClick={toggleExpanded}
          _hover={hoverStyle}
          w='full'
        >
          <RawText color='text.subtle' fontSize='sm' fontWeight='medium'>
            {key}
          </RawText>
          {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </Button>
        {isExpanded && (
          <VStack align='stretch' spacing={0}>
            {childrenWithLevel.map((child, index) => (
              <StructuredFieldComponent
                key={`${child.key}-${index}`}
                field={child}
                chainId={chainId}
              />
            ))}
          </VStack>
        )}
      </Box>
    )
  }

  if (Array.isArray(value)) {
    return (
      <Box py={0.5} pl={paddingLeft}>
        <HStack justify='space-between' align='flex-start'>
          <RawText color='text.subtle' fontSize='sm'>
            {key}
          </RawText>
          <VStack align='end' spacing={1}>
            {value.map((item, index) => {
              const itemString = String(item)
              return <ExpandableCell key={index} value={itemString} threshold={20} />
            })}
          </VStack>
        </HStack>
      </Box>
    )
  }

  const valueString = value !== null && value !== undefined ? String(value) : ''
  const isHexField = valueString.startsWith('0x')
  const isUnknownAsset = isHexField && !asset

  if (asset) {
    return (
      <HStack justify='space-between' align='center' py={0.5} pl={paddingLeft}>
        <RawText color='text.subtle' fontSize='sm'>
          {key}
        </RawText>
        <HStack spacing={2} align='center'>
          <RawText fontSize='sm' fontWeight='bold'>
            {asset.symbol}
          </RawText>
          <Image boxSize='20px' src={asset.icon} borderRadius='full' />
        </HStack>
      </HStack>
    )
  }

  // Just display the field as-is unless we know how to display an icon and symbol in place of raw addy
  if (isUnknownAsset) {
    return (
      <Box py={0.5} pl={paddingLeft}>
        <HStack justify='space-between' align='flex-start'>
          <RawText color='text.subtle' fontSize='sm'>
            {key}
          </RawText>
          <ExpandableCell value={valueString} />
        </HStack>
      </Box>
    )
  }

  return (
    <HStack justify='space-between' align='center' py={0.5} pl={paddingLeft}>
      <RawText color='text.subtle' fontSize='sm'>
        {key}
      </RawText>
      <ExpandableCell value={valueString} />
    </HStack>
  )
}

export type StructuredMessageProps = {
  fields: StructuredField[]
  chainId: ChainId
  isLoading?: boolean
}

export const StructuredMessage: FC<StructuredMessageProps> = ({
  fields,
  chainId,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <VStack align='stretch' spacing={2}>
        <Skeleton height='24px' />
        <Skeleton height='24px' />
        <Skeleton height='24px' />
      </VStack>
    )
  }

  if (!fields || fields.length === 0) return null

  return (
    <VStack align='stretch' spacing={0}>
      {fields.map((field, index) => (
        <StructuredFieldComponent key={`${field.key}-${index}`} field={field} chainId={chainId} />
      ))}
    </VStack>
  )
}
