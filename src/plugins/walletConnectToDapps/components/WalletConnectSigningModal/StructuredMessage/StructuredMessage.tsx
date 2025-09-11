import { Box, Button, HStack, Image, Skeleton, VStack } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa'
import { isAddress } from 'viem'

import { ExpandableAddressCell } from './ExpandableAddressCell'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from '@/components/Text'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type StructuredField = {
  key: string
  value: any
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
  const [isExpanded, setIsExpanded] = useState(false)

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

  const handleToggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded)
  }, [isExpanded])

  const hoverStyle = useMemo(() => ({ bg: 'whiteAlpha.50' }), [])

  const childrenWithLevel = useMemo(() => {
    return children?.map(child => ({ ...child, level: level + 1 })) || []
  }, [children, level])

  if (children && children.length > 0) {
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
          onClick={handleToggleExpanded}
          _hover={hoverStyle}
          w='full'
        >
          <RawText color='text.subtle' fontSize='sm' fontWeight='medium'>
            {key}
          </RawText>
          <Box as={isExpanded ? FaChevronUp : FaChevronDown} w={3} h={3} />
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
              if (typeof item === 'string' && isAddress(item)) {
                return <ExpandableAddressCell key={index} address={itemString} />
              }
              return (
                <RawText key={index} fontSize='sm' fontWeight='bold'>
                  {itemString.length > 20 ? (
                    <MiddleEllipsis value={itemString} fontSize='sm' />
                  ) : (
                    itemString
                  )}
                </RawText>
              )
            })}
          </VStack>
        </HStack>
      </Box>
    )
  }

  const valueString = String(value)
  const isAddressField = typeof value === 'string' && isAddress(value)
  const isAddressWithoutAsset = isAddressField && !asset

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

  if (isAddressWithoutAsset) {
    return (
      <Box py={0.5} pl={paddingLeft}>
        <HStack justify='space-between' align='flex-start'>
          <RawText color='text.subtle' fontSize='sm'>
            {key}
          </RawText>
          <ExpandableAddressCell address={valueString} />
        </HStack>
      </Box>
    )
  }

  return (
    <HStack justify='space-between' align='center' py={0.5} pl={paddingLeft}>
      <RawText color='text.subtle' fontSize='sm'>
        {key}
      </RawText>
      <RawText fontSize='sm' fontWeight='bold'>
        {valueString.length > 30 ? (
          <MiddleEllipsis value={valueString} fontSize='sm' />
        ) : (
          valueString
        )}
      </RawText>
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
