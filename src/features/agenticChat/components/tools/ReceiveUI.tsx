import { Box, Button, Flex, Icon, Text, useColorModeValue, useToast } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { FaCheck, FaCopy, FaDownload } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import type { ToolUIProps } from '../../types/toolInvocation'
import { DisplayToolCard } from './DisplayToolCard'

import { LogoQRCode } from '@/components/LogoQRCode/LogoQRCode'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const ReceiveUI = ({ toolPart }: ToolUIProps<'receiveTool'>) => {
  const translate = useTranslate()
  const toast = useToast()
  const { state, output: toolOutput } = toolPart

  const mutedColor = useColorModeValue('gray.600', 'gray.400')
  const warningBg = useColorModeValue('orange.50', 'orange.900')
  const warningColor = useColorModeValue('orange.700', 'orange.200')
  const bgColor = useColorModeValue('gray.50', 'gray.700')

  const asset = useAppSelector(state =>
    toolOutput?.asset.assetId ? selectAssetById(state, toolOutput.asset.assetId) : undefined,
  )

  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 })

  const handleCopyAddress = useCallback(() => {
    if (!toolOutput) return
    copyToClipboard(toolOutput.address)
    toast({
      title: translate('agenticChat.agenticChatTools.receive.copied'),
      status: 'success',
      duration: 2000,
      isClosable: true,
    })
  }, [toolOutput, translate, toast, copyToClipboard])

  const receiveTitle = useMemo(() => {
    if (!toolOutput) return ''
    return translate('agenticChat.agenticChatTools.receive.receiveOn', {
      symbol: toolOutput.asset.symbol,
      network: toolOutput.chainName || toolOutput.network,
    })
  }, [toolOutput, translate])

  if (state === 'output-error' || !toolOutput || !asset) {
    return null
  }

  const { address, chainName, network } = toolOutput

  return (
    <DisplayToolCard.Root>
      <DisplayToolCard.Header>
        <DisplayToolCard.HeaderRow>
          <Flex alignItems='center' gap={2}>
            <Icon as={FaDownload} boxSize={5} color='blue.500' />
            <Text fontSize='lg' fontWeight='semibold'>
              {translate('agenticChat.agenticChatTools.receive.title')}
            </Text>
          </Flex>
        </DisplayToolCard.HeaderRow>
        <Text fontSize='sm' color={mutedColor}>
          {receiveTitle}
        </Text>
      </DisplayToolCard.Header>
      <DisplayToolCard.Content>
        <Flex direction='column' gap={4} alignItems='center'>
          <LogoQRCode text={address} asset={asset} size={256} />

          <Flex direction='column' gap={2} w='full' bg={bgColor} p={3} borderRadius='md'>
            <Text fontSize='xs' color={mutedColor} textAlign='center' fontWeight='medium'>
              {translate('agenticChat.agenticChatTools.receive.copyAddress')}
            </Text>
            <Flex gap={2} alignItems='center'>
              <Text
                fontSize='sm'
                fontFamily='mono'
                flex={1}
                textAlign='center'
                wordBreak='break-all'
                noOfLines={2}
              >
                {address}
              </Text>
              <Button
                size='sm'
                onClick={handleCopyAddress}
                leftIcon={<Icon as={isCopied ? FaCheck : FaCopy} />}
                colorScheme={isCopied ? 'green' : undefined}
                flexShrink={0}
              >
                {translate('agenticChat.agenticChatTools.receive.copyAddress')}
              </Button>
            </Flex>
          </Flex>

          <Box w='full' bg={warningBg} p={3} borderRadius='md'>
            <Text fontSize='xs' color={warningColor} textAlign='center'>
              {translate('agenticChat.agenticChatTools.receive.warning', {
                network: chainName ?? network,
              })}
            </Text>
          </Box>
        </Flex>
      </DisplayToolCard.Content>
    </DisplayToolCard.Root>
  )
}
