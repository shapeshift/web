import { Card, HStack, Image, useColorModeValue, VStack } from '@chakra-ui/react'
import type { ChainReference } from '@shapeshiftoss/caip'
// Using simple interface for parsed JSON instead of strict abitype types
import { CHAIN_NAMESPACE, fromChainId, toChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { validateTypedData } from 'viem'

import { ModalSection } from './ModalSection'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from '@/components/Text'
import { ExternalLinkButton } from '@/plugins/walletConnectToDapps/components/modals/ExternalLinkButtons'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type EIP712FieldValue = string | number | boolean | string[] | number[] | boolean[] | null

interface MessageFieldProps {
  name: string
  value: EIP712FieldValue
  type?: string
}

const MessageField: React.FC<MessageFieldProps> = ({ name, value, type }) => {
  const cardBg = useColorModeValue('gray.50', 'gray.850')

  const formattedValue = useMemo(() => {
    if (value === null || value === undefined) return 'null'

    if (!type) {
      return String(value)
    }

    // Address type
    if (type === 'address') {
      // Always show full address for security - no ellipsis
      return String(value)
    }

    // Number types
    if (type.startsWith('uint') || type.startsWith('int')) {
      // Format large numbers with thousand separators
      const numStr = String(value)
      if (numStr.length > 12) {
        // For very large numbers, show in scientific notation or abbreviated
        return numStr
      }
      return Number(value).toLocaleString()
    }

    // Bytes types
    if (type.startsWith('bytes')) {
      // Show bytes data in monospace with ellipsis for long values
      const bytesStr = String(value)
      if (bytesStr.length > 66) {
        return <MiddleEllipsis value={bytesStr} />
      }
      return bytesStr
    }

    // Boolean type
    if (type === 'bool') {
      return value ? 'true' : 'false'
    }

    // Array types
    if (type.includes('[')) {
      return JSON.stringify(value)
    }

    // Default to string
    return String(value)
  }, [value, type])

  const formatFieldName = (fieldName: string): string => {
    // Convert camelCase to Title Case
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  return (
    <VStack align='stretch' py={3} px={3} bg={cardBg} borderRadius='md' spacing={2}>
      <RawText color='text.subtle' fontWeight='medium' fontSize='sm'>
        {formatFieldName(name)}
      </RawText>
      <RawText
        fontFamily={type === 'address' || type?.startsWith('bytes') ? 'monospace' : 'body'}
        fontSize='sm'
        wordBreak='break-all'
        whiteSpace='pre-wrap'
      >
        {formattedValue}
      </RawText>
    </VStack>
  )
}

interface DomainSectionProps {
  domain: {
    name?: string
    version?: string
    chainId?: string | number
    verifyingContract?: string
    salt?: string
  }
  networkId?: string
}

const DomainSection: React.FC<DomainSectionProps> = ({ domain, networkId }) => {
  const translate = useTranslate()
  const cardBg = useColorModeValue('white', 'gray.850')

  const domainChainId = useMemo(() => {
    if (!networkId) return undefined

    try {
      return toChainId({
        chainNamespace: CHAIN_NAMESPACE.Evm,
        chainReference: networkId as ChainReference,
      })
    } catch {
      return undefined
    }
  }, [networkId])

  const domainFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, domainChainId ?? ''),
  )

  const contractExplorerLink = useMemo(() => {
    if (!domain.verifyingContract || !domainFeeAsset?.explorerAddressLink) {
      return undefined
    }
    return `${domainFeeAsset.explorerAddressLink}${domain.verifyingContract}`
  }, [domain.verifyingContract, domainFeeAsset?.explorerAddressLink])

  return (
    <Card bg={cardBg} borderRadius='md' p={4}>
      <VStack align='stretch' spacing={2}>
        {domain.verifyingContract && (
          <HStack justify='space-between' align='center' minH='24px'>
            <RawText color='text.subtle' fontSize='sm'>
              Contract
            </RawText>
            <HStack spacing={2} align='center'>
              <RawText>
                {domain.name || <MiddleEllipsis value={domain.verifyingContract} />}
              </RawText>
              <HStack w='24px' h='24px' justify='center' align='center'>
                {contractExplorerLink && (
                  <ExternalLinkButton
                    href={contractExplorerLink}
                    ariaLabel='View contract on explorer'
                  />
                )}
              </HStack>
            </HStack>
          </HStack>
        )}

        {domain.chainId && (
          <HStack justify='space-between' align='center' minH='24px'>
            <RawText color='text.subtle' fontSize='sm'>
              {translate('plugins.walletConnectToDapps.modal.signMessage.network')}
            </RawText>
            <HStack spacing={2} align='center'>
              <RawText>{domainFeeAsset?.networkName || `Chain ID: ${domain.chainId}`}</RawText>
              <HStack w='24px' h='24px' justify='center' align='center'>
                {domainFeeAsset && (
                  <Image boxSize='16px' src={domainFeeAsset.networkIcon ?? domainFeeAsset.icon} />
                )}
              </HStack>
            </HStack>
          </HStack>
        )}
      </VStack>
    </Card>
  )
}

export interface EIP712MessageDisplayProps {
  typedData: string
  chainId?: string
}

export const EIP712MessageDisplay: React.FC<EIP712MessageDisplayProps> = ({
  typedData,
  chainId,
}) => {
  const cardBg = useColorModeValue('white', 'gray.850')

  // Extract networkId from chainId for passing to DomainSection
  const networkId = useMemo(() => {
    if (!chainId) return undefined
    try {
      const { chainReference } = fromChainId(chainId)
      return chainReference
    } catch {
      return undefined
    }
  }, [chainId])

  const parsedData = useMemo(() => {
    try {
      const parsed = JSON.parse(typedData)
      validateTypedData(parsed)
      return parsed
    } catch {
      return null
    }
  }, [typedData])

  if (!parsedData) {
    // Fallback to raw display if not proper EIP-712
    return (
      <Card bg={cardBg} borderRadius='md' p={4}>
        <RawText fontFamily='monospace' fontSize='sm' wordBreak='break-all'>
          {typedData}
        </RawText>
      </Card>
    )
  }

  const { types, primaryType, domain, message } = parsedData
  const messageType = types[primaryType]

  return (
    <>
      {/* Domain Information */}
      {domain && Object.keys(domain).length > 0 && (
        <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.domain'>
          <DomainSection domain={domain} networkId={networkId} />
        </ModalSection>
      )}

      {/* Message Content */}
      <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.message'>
        <VStack align='stretch' spacing={2}>
          {/* Primary Type as first field */}
          <MessageField name='Primary Type' value={primaryType} />

          {/* Message fields */}
          {Object.entries(message).map(([key, value]) => {
            const fieldType = Array.isArray(messageType)
              ? messageType.find(field => field.name === key)?.type
              : undefined
            return (
              <MessageField
                key={key}
                name={key}
                value={value as EIP712FieldValue}
                type={fieldType}
              />
            )
          })}
        </VStack>
      </ModalSection>
    </>
  )
}
