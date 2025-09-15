import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  HStack,
  IconButton,
  Image,
  VStack,
} from '@chakra-ui/react'
import type { FC } from 'react'

import { RawText } from '@/components/Text'
import type { EvmChainData } from '@/plugins/walletConnectToDapps/types'

type NetworkSelectionProps = {
  allEvmChainData: EvmChainData[]
  selectedChainIds: string[]
  requiredChainIds: string[]
  onChainIdsChange: (chainIds: string[]) => void
  onBack: () => void
  onDone: () => void
  canProceed: boolean
  translate: (key: string) => string
}

export const NetworkSelection: FC<NetworkSelectionProps> = ({
  allEvmChainData,
  selectedChainIds,
  requiredChainIds,
  onChainIdsChange,
  onBack,
  onDone,
  canProceed,
  translate,
}) => {
  return (
    <VStack spacing={0} align='stretch' h='full'>
      {/* Header with back arrow */}
      <HStack spacing={3} p={4} align='center'>
        <IconButton
          aria-label='Back'
          icon={<ArrowBackIcon />}
          size='sm'
          variant='ghost'
          onClick={onBack}
        />
        <RawText fontWeight='semibold' fontSize='xl' flex={1} textAlign='center'>
          {translate('plugins.walletConnectToDapps.modal.chooseNetwork')}
        </RawText>
        <Box w={8} /> {/* Spacer for centering */}
      </HStack>

      {/* Network list */}
      <CheckboxGroup
        value={selectedChainIds}
        onChange={values => onChainIdsChange(values as string[])}
      >
        <VStack spacing={0} align='stretch' px={4} pb={4} flex={1}>
          {allEvmChainData.map(chain => {
            const isRequired = requiredChainIds.includes(chain.chainId)
            const isDisabled = !chain.hasAccount || isRequired

            return (
              <Box key={chain.chainId} py={3}>
                <HStack spacing={3} align='center'>
                  <Checkbox
                    value={chain.chainId}
                    isDisabled={isDisabled}
                    isChecked={selectedChainIds.includes(chain.chainId)}
                  >
                    <HStack spacing={3} align='center'>
                      <Image src={chain.icon} boxSize='32px' borderRadius='full' />
                      <VStack spacing={0} align='start'>
                        <HStack spacing={2} align='center'>
                          <RawText fontWeight='medium'>{chain.name}</RawText>
                          {isRequired && (
                            <RawText
                              fontSize='xs'
                              color='red.500'
                              bg='rgba(254, 178, 178, 0.1)'
                              px={2}
                              py={1}
                              borderRadius='md'
                            >
                              {translate('common.required')}
                            </RawText>
                          )}
                        </HStack>
                        {!chain.hasAccount && (
                          <RawText fontSize='xs' color='text.subtle'>
                            {translate('plugins.walletConnectToDapps.modal.noAccount')}
                          </RawText>
                        )}
                      </VStack>
                    </HStack>
                  </Checkbox>
                </HStack>
              </Box>
            )
          })}
        </VStack>
      </CheckboxGroup>

      {/* Done button */}
      <Box p={4}>
        <Button
          size='lg'
          colorScheme='blue'
          w='full'
          onClick={onDone}
          isDisabled={
            !canProceed ||
            !requiredChainIds.every(
              chainId =>
                selectedChainIds.includes(chainId) &&
                allEvmChainData.find(chain => chain.chainId === chainId)?.hasAccount,
            )
          }
        >
          {translate('common.done')}
        </Button>
      </Box>
    </VStack>
  )
}
