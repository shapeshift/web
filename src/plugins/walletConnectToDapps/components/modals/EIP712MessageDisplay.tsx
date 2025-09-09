import { Box, Card, Divider, HStack, Image, Tag, useColorModeValue, VStack } from '@chakra-ui/react'
import type { ChainReference } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, toChainId } from '@shapeshiftoss/caip'
import type { TypedDataDomain } from 'abitype'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { validateTypedData } from 'viem'

import { ModalSection } from './ModalSection'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from '@/components/Text'
import { ExternalLinkButton } from '@/plugins/walletConnectToDapps/components/modals/ExternalLinkButtons'
import type { EIP712TypedData, EIP712Value } from '@/plugins/walletConnectToDapps/types'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type MessageFieldProps = {
  name: string
  value: EIP712Value
  isPrimaryType?: boolean
}

const MessageField: React.FC<MessageFieldProps> = ({ name, value, isPrimaryType = false }) => {
  const valueString = String(value)
  const isLongValue = valueString.length > 30 // Threshold for switching to vertical layout
  
  const renderValue = () => {
    if (isPrimaryType) {
      return (
        <Tag size='sm' colorScheme='blue' variant='subtle'>
          {value}
        </Tag>
      )
    }
    return (
      <RawText fontSize='sm' wordBreak='break-all' whiteSpace='pre-wrap' flex={1}>
        {value}
      </RawText>
    )
  }
  
  if (isLongValue) {
    // Vertical layout for long values
    return (
      <VStack align='stretch' spacing={2} py={3}>
        <RawText color='text.subtle' fontWeight='medium' fontSize='sm'>
          {name}
        </RawText>
        {renderValue()}
      </VStack>
    )
  }
  
  // Horizontal layout for short values
  return (
    <HStack align='flex-start' spacing={4} py={3}>
      <RawText color='text.subtle' fontWeight='medium' fontSize='sm' minW='120px'>
        {name}
      </RawText>
      <Box flex={1}>
        {renderValue()}
      </Box>
    </HStack>
  )
}

type DomainSectionProps = {
  domain: TypedDataDomain
}

const DomainSection: React.FC<DomainSectionProps> = ({ domain }) => {
  const translate = useTranslate()
  const cardBg = useColorModeValue('white', 'whiteAlpha.50')

  const domainChainId = useMemo(() => {
    if (!domain.chainId) return

    try {
      return toChainId({
        chainNamespace: CHAIN_NAMESPACE.Evm,
        chainReference: String(domain.chainId) as ChainReference,
      })
    } catch {
      // This shouldn't happen, as this should be an evm networkId we support but...
      return
    }
  }, [domain.chainId])

  const domainFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, domainChainId ?? ''),
  )

  const contractExplorerLink = useMemo(() => {
    if (!domainFeeAsset) return
    if (!domain.verifyingContract) return

    return `${domainFeeAsset.explorerAddressLink}${domain.verifyingContract}`
  }, [domain?.verifyingContract, domainFeeAsset])

  return (
    <Card bg={cardBg} borderRadius='2xl' p={4}>
      <VStack align='stretch' spacing={2}>
        {domain.verifyingContract && (
          <HStack justify='space-between' align='center' minH='24px'>
            <RawText color='text.subtle' fontSize='sm'>
              {translate('plugins.walletConnectToDapps.modal.signMessage.contract')}
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
        {domainFeeAsset && (
          <HStack justify='space-between' align='center' minH='24px'>
            <RawText color='text.subtle' fontSize='sm'>
              {translate('common.network')}
            </RawText>
            <HStack spacing={2} align='center'>
              <RawText>{domainFeeAsset.networkName}</RawText>
              <HStack w='24px' h='24px' justify='center' align='center'>
                <Image boxSize='16px' src={domainFeeAsset.networkIcon ?? domainFeeAsset.icon} />
              </HStack>
            </HStack>
          </HStack>
        )}
      </VStack>
    </Card>
  )
}

type EIP712MessageDisplayProps = {
  typedData: string
}

export const EIP712MessageDisplay: React.FC<EIP712MessageDisplayProps> = ({ typedData }) => {
  const translate = useTranslate()
  const cardBg = useColorModeValue('white', 'whiteAlpha.50')

  const parsedData = useMemo((): EIP712TypedData | null => {
    try {
      const parsed = JSON.parse(typedData)
      validateTypedData(parsed)
      return parsed as EIP712TypedData
    } catch {
      return null
    }
  }, [typedData])

  if (!parsedData) {
    return (
      <Card bg={cardBg} borderRadius='2xl' p={4}>
        <RawText fontFamily='monospace' fontSize='sm' wordBreak='break-all'>
          {typedData}
        </RawText>
      </Card>
    )
  }

  const { primaryType, domain, message } = parsedData

  return (
    <>
      {domain && Object.keys(domain).length > 0 && (
        <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.domain'>
          <DomainSection domain={domain} />
        </ModalSection>
      )}

      <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.message'>
        <Card bg={cardBg} borderRadius='2xl' p={4}>
          <VStack align='stretch' spacing={2}>
            <MessageField
              name={translate('plugins.walletConnectToDapps.modal.signMessage.primaryType')}
              value={primaryType}
              isPrimaryType={true}
            />
            {Object.entries(message).map(([key, value]) => (
              <MessageField key={key} name={key} value={value} />
            ))}
          </VStack>
        </Card>
      </ModalSection>
    </>
  )
}
