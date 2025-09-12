import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import { Box, Button, Card, HStack, Image, VStack } from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { validateTypedData } from 'viem'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { RawText } from '@/components/Text'
import { ExternalLinkButton } from '@/plugins/walletConnectToDapps/components/modals/ExternalLinkButtons'
import { StructuredMessage } from '@/plugins/walletConnectToDapps/components/WalletConnectSigningModal/StructuredMessage/StructuredMessage'
import type { EIP712TypedData } from '@/plugins/walletConnectToDapps/types'
import { getChainIdFromDomain } from '@/plugins/walletConnectToDapps/utils'
import { convertEIP712ToStructuredFields } from '@/plugins/walletConnectToDapps/utils/eip712'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type EIP712MessageDisplayProps = {
  message: string
}

export const EIP712MessageDisplay: React.FC<EIP712MessageDisplayProps> = ({ message }) => {
  const translate = useTranslate()
  const [isMessageExpanded, setIsMessageExpanded] = useState(true)

  const parsedData = useMemo((): EIP712TypedData | null => {
    try {
      const parsed = JSON.parse(message)
      validateTypedData(parsed)
      return parsed as EIP712TypedData
    } catch {
      return null
    }
  }, [message])

  const domainChainId = useMemo(() => getChainIdFromDomain(message), [message])

  const domainFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, domainChainId ?? ''),
  )

  const contractExplorerLink = useMemo(() => {
    if (!domainFeeAsset || !parsedData?.domain?.verifyingContract) return
    return `${domainFeeAsset.explorerAddressLink}${parsedData.domain.verifyingContract}`
  }, [parsedData?.domain?.verifyingContract, domainFeeAsset])

  const handleToggleExpanded = useCallback(() => {
    setIsMessageExpanded(!isMessageExpanded)
  }, [isMessageExpanded])

  const hoverStyle = useMemo(() => ({ bg: 'transparent' }), [])

  if (!parsedData) {
    return (
      <Card borderRadius='2xl' p={4}>
        <RawText fontFamily='monospace' fontSize='sm' wordBreak='break-all'>
          {message}
        </RawText>
      </Card>
    )
  }

  const { primaryType, domain, message: parsedMessage } = parsedData

  if (!domainChainId) return null

  return (
    <Card borderRadius='2xl' p={4}>
      <VStack spacing={3} align='stretch'>
        {domain?.verifyingContract && (
          <HStack justify='space-between' align='center' py={1}>
            <RawText color='text.subtle' fontSize='sm'>
              {translate('plugins.walletConnectToDapps.modal.signMessage.contract')}
            </RawText>
            <HStack spacing={2} align='center'>
              <RawText fontSize='sm' fontWeight='bold'>
                {domain.name || <MiddleEllipsis value={domain.verifyingContract} />}
              </RawText>
              {contractExplorerLink && (
                <ExternalLinkButton
                  href={contractExplorerLink}
                  ariaLabel='View contract on explorer'
                />
              )}
            </HStack>
          </HStack>
        )}

        {domainFeeAsset && (
          <HStack justify='space-between' align='center' py={1}>
            <RawText color='text.subtle' fontSize='sm'>
              {translate('common.network')}
            </RawText>
            <HStack spacing={2} align='center'>
              <RawText fontSize='sm' fontWeight='bold'>
                {domainFeeAsset.networkName}
              </RawText>
              <Image boxSize='20px' src={domainFeeAsset.networkIcon ?? domainFeeAsset.icon} />
            </HStack>
          </HStack>
        )}

        <Box borderTop='1px solid' borderColor='whiteAlpha.100' pt={4} mt={2}>
          <Button
            variant='ghost'
            size='sm'
            p={0}
            h='auto'
            fontWeight='medium'
            justifyContent='space-between'
            onClick={handleToggleExpanded}
            _hover={hoverStyle}
            w='full'
            mb={3}
          >
            <RawText fontSize='sm' fontWeight='medium' color='text.subtle'>
              {translate('plugins.walletConnectToDapps.modal.signMessage.message')}
            </RawText>
            {isMessageExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </Button>

          {isMessageExpanded && (
            <StructuredMessage
              fields={convertEIP712ToStructuredFields(parsedMessage, primaryType)}
              chainId={domainChainId}
            />
          )}
        </Box>
      </VStack>
    </Card>
  )
}
