import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Circle,
  HStack,
  IconButton,
  Tooltip,
  VStack,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import type { ProposalTypes } from '@walletconnect/types'
import { uniq } from 'lodash'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { RawText } from '@/components/Text'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { selectAccountIdsByAccountNumberAndChainId } from '@/state/slices/portfolioSlice/selectors'
import { selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const backIcon = <ArrowBackIcon />

const checkboxSx = {
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
}

const requiredCheckboxSx = {
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
}

type NetworkSelectionProps = {
  selectedChainIds: ChainId[]
  requiredChainIds: ChainId[]
  selectedAccountNumber: number | null
  requiredNamespaces: ProposalTypes.RequiredNamespaces
  onSelectedChainIdsChange: (chainIds: ChainId[]) => void
  onBack: () => void
  onDone: () => void
}

export const NetworkSelection: FC<NetworkSelectionProps> = ({
  selectedChainIds,
  requiredChainIds,
  selectedAccountNumber,
  requiredNamespaces,
  onSelectedChainIdsChange,
  onBack,
  onDone,
}) => {
  const assetsById = useAppSelector(selectAssets)
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )
  const chainAdapterManager = getChainAdapterManager()
  const translate = useTranslate()

  const allEvmChainIds = useMemo(() => {
    // Use all EVM chains where the user has accounts as source of truth
    const userChainIds =
      selectedAccountNumber !== null
        ? Object.entries(accountIdsByAccountNumberAndChainId[selectedAccountNumber] ?? {})
            .filter(([chainId]) => chainId.startsWith('eip155:'))
            .map(([chainId]) => chainId)
        : []

    // Add any required chains from the dApp (even if user doesn't have accounts)
    const requiredFromNamespaces = Object.values(requiredNamespaces)
      .flatMap(namespace => namespace.chains ?? [])
      .filter(chainId => chainId.startsWith('eip155:'))

    const allChainIds = uniq([...userChainIds, ...requiredFromNamespaces])

    return allChainIds.sort((a, b) => {
      const aRequired = requiredChainIds.includes(a)
      const bRequired = requiredChainIds.includes(b)
      if (aRequired && !bRequired) return -1
      if (!aRequired && bRequired) return 1
      return a.localeCompare(b)
    })
  }, [
    selectedAccountNumber,
    accountIdsByAccountNumberAndChainId,
    requiredNamespaces,
    requiredChainIds,
  ])

  const handleChainIdsChange = useCallback(
    (values: (string | number)[]) => onSelectedChainIdsChange(values as ChainId[]),
    [onSelectedChainIdsChange],
  )

  const handleSelectAllChains = useCallback(() => {
    if (selectedAccountNumber !== null) {
      const availableChainIds = Object.keys(
        accountIdsByAccountNumberAndChainId[selectedAccountNumber] ?? {},
      ).filter(chainId => chainId.startsWith('eip155:'))
      onSelectedChainIdsChange(availableChainIds as ChainId[])
    }
  }, [selectedAccountNumber, accountIdsByAccountNumberAndChainId, onSelectedChainIdsChange])

  return (
    <VStack spacing={0} align='stretch' h='full'>
      <HStack spacing={3} p={4} align='center'>
        <IconButton aria-label='Back' icon={backIcon} size='sm' variant='ghost' onClick={onBack} />
        <RawText fontWeight='semibold' fontSize='xl' flex={1} textAlign='center'>
          {translate('plugins.walletConnectToDapps.modal.chooseNetwork')}
        </RawText>
        <Button size='sm' variant='link' colorScheme='blue' onClick={handleSelectAllChains}>
          {translate('common.selectAll')}
        </Button>
      </HStack>
      <CheckboxGroup value={selectedChainIds} onChange={handleChainIdsChange}>
        <VStack spacing={0} align='stretch' px={4} pb={4} flex={1}>
          {allEvmChainIds.map(chainId => {
            const feeAssetId = chainAdapterManager.get(chainId)?.getFeeAssetId()
            const feeAsset = feeAssetId ? assetsById[feeAssetId] : undefined
            const chainName = chainAdapterManager.get(chainId)?.getDisplayName() ?? chainId
            const networkIcon = feeAsset?.networkIcon ?? feeAsset?.icon
            const hasAccount =
              selectedAccountNumber !== null
                ? Boolean(accountIdsByAccountNumberAndChainId[selectedAccountNumber]?.[chainId])
                : false
            const isRequired = requiredChainIds.includes(chainId)
            const isDisabled = isRequired

            if (!networkIcon) return null
            if (!hasAccount && !isRequired) return null

            const content = (
              <Box key={chainId} py={3} opacity={hasAccount ? 1 : 0.5}>
                <HStack spacing={3} width='full' align='center'>
                  <LazyLoadAvatar borderRadius='full' boxSize='40px' src={networkIcon} />
                  <VStack spacing={0} align='start' flex={1}>
                    <HStack spacing={2} align='center'>
                      <RawText fontSize='md' fontWeight='medium'>
                        {chainName}
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
                            {translate('plugins.walletConnectToDapps.modal.required')}
                          </RawText>
                        </HStack>
                      )}
                    </HStack>
                  </VStack>
                  <Checkbox
                    value={chainId}
                    isDisabled={isDisabled}
                    size='lg'
                    colorScheme={isRequired ? 'gray' : 'blue'}
                    sx={isRequired ? requiredCheckboxSx : checkboxSx}
                  />
                </HStack>
              </Box>
            )

            return !hasAccount ? (
              <Tooltip
                key={chainId}
                label={translate('plugins.walletConnectToDapps.modal.noAccount').replace(
                  '%{chainName}',
                  chainName,
                )}
                placement='right'
              >
                {content}
              </Tooltip>
            ) : (
              content
            )
          })}
        </VStack>
      </CheckboxGroup>
      <Box p={4}>
        <Button size='lg' colorScheme='blue' w='full' onClick={onDone}>
          {translate('common.done')}
        </Button>
      </Box>
    </VStack>
  )
}
