import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Circle,
  HStack,
  IconButton,
  Image,
  VStack,
} from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'

import { RawText } from '@/components/Text'

type EvmChainData = {
  chainId: string
  icon: string | undefined
  name: string
  hasAccount: boolean
}

type NetworkSelectionProps = {
  allEvmChainData: EvmChainData[]
  selectedChainIds: string[]
  requiredChainIds: string[]
  onChainIdsChange: (chainIds: string[]) => void
  onBack: () => void
  onDone: () => void
  translate: (key: string) => string
}

export const NetworkSelection: FC<NetworkSelectionProps> = ({
  allEvmChainData,
  selectedChainIds,
  requiredChainIds,
  onChainIdsChange,
  onBack,
  onDone,
  translate,
}) => {
  const handleChainIdsChange = useCallback(
    (values: (string | number)[]) => onChainIdsChange(values as string[]),
    [onChainIdsChange],
  )
  const spacerBox = useMemo(() => <Box w={8} />, [])
  const backIcon = useMemo(() => <ArrowBackIcon />, [])
  const checkboxSx = useMemo(
    () => ({
      '& .chakra-checkbox__control': {
        borderRadius: 'full',
        width: '24px',
        height: '24px',
        borderWidth: '2px',
        borderColor: 'gray.300',
        _checked: {
          bg: 'blue.500',
          borderColor: 'blue.500',
        },
      },
      '& .chakra-checkbox__control[data-checked]': {
        bg: 'blue.500',
        borderColor: 'blue.500',
      },
    }),
    [],
  )
  const requiredCheckboxSx = useMemo(
    () => ({
      '& .chakra-checkbox__control': {
        borderRadius: 'full',
        width: '24px',
        height: '24px',
        borderWidth: '2px',
        borderColor: 'gray.300',
        _checked: {
          bg: 'gray.400',
          borderColor: 'gray.400',
        },
      },
      '& .chakra-checkbox__control[data-checked]': {
        bg: 'gray.400',
        borderColor: 'gray.400',
      },
    }),
    [],
  )

  return (
    <VStack spacing={0} align='stretch' h='full'>
      {/* Header with back arrow */}
      <HStack spacing={3} p={4} align='center'>
        <IconButton aria-label='Back' icon={backIcon} size='sm' variant='ghost' onClick={onBack} />
        <RawText fontWeight='semibold' fontSize='xl' flex={1} textAlign='center'>
          {translate('plugins.walletConnectToDapps.modal.chooseNetwork')}
        </RawText>
        {spacerBox}
      </HStack>

      {/* Network list */}
      <CheckboxGroup value={selectedChainIds} onChange={handleChainIdsChange}>
        <VStack spacing={0} align='stretch' px={4} pb={4} flex={1}>
          {allEvmChainData.map(chain => {
            const isRequired = requiredChainIds.includes(chain.chainId)
            const isDisabled = !chain.hasAccount || isRequired

            return (
              <Box key={chain.chainId} py={3} opacity={chain.hasAccount ? 1 : 0.5}>
                <HStack spacing={3} width='full' align='center'>
                  <Image borderRadius='full' boxSize='40px' src={chain.icon} />
                  <VStack spacing={0} align='start' flex={1}>
                    <HStack spacing={2} align='center'>
                      <RawText fontSize='md' fontWeight='medium'>
                        {chain.name}
                      </RawText>
                      {isRequired && (
                        <HStack
                          spacing={1}
                          px={2}
                          py={1}
                          bg='rgba(254, 178, 178, 0.1)'
                          borderRadius='full'
                          fontSize='xs'
                          fontWeight='medium'
                          color='red.500'
                          align='center'
                        >
                          <Circle size='12px' bg='red.500' color='white'>
                            <RawText fontSize='8px' fontWeight='bold'>
                              !
                            </RawText>
                          </Circle>
                          <RawText fontSize='xs' color='red.500' fontWeight='medium'>
                            Required
                          </RawText>
                        </HStack>
                      )}
                    </HStack>
                  </VStack>
                  <Checkbox
                    value={chain.chainId}
                    isDisabled={isDisabled}
                    size='lg'
                    colorScheme={isRequired ? 'gray' : 'blue'}
                    sx={isRequired ? requiredCheckboxSx : checkboxSx}
                  />
                </HStack>
              </Box>
            )
          })}
        </VStack>
      </CheckboxGroup>

      {/* Done button */}
      <Box p={4}>
        <Button size='lg' colorScheme='blue' w='full' onClick={onDone}>
          {translate('common.done')}
        </Button>
      </Box>
    </VStack>
  )
}
