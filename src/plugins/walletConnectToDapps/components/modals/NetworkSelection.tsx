import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Circle,
  HStack,
  Tooltip,
  VStack,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ProposalTypes } from '@walletconnect/types'
import { partition, uniq } from 'lodash'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import {
  DialogHeader,
  DialogHeaderLeft,
  DialogHeaderMiddle,
  DialogHeaderRight,
} from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { RawText } from '@/components/Text'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { selectAccountIdsByAccountNumberAndChainId } from '@/state/slices/portfolioSlice/selectors'
import { selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const checkboxSx = {
  '& .chakra-checkbox__label': {
    marginLeft: 0,
  },
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
  '& .chakra-checkbox__label': {
    marginLeft: 0,
  },
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
  selectedAccountNumber: number
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
  const translate = useTranslate()
  const assetsById = useAppSelector(selectAssets)
  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdsByAccountNumberAndChainId,
  )

  const availableChainIds = useMemo(() => {
    // Use all EVM chains available for the selected account number as a source of truth
    // Do *not* honor wc optional namespaces, the app is the source of truth, and the app may or may not handle additional one at their discretion
    // This is to keep things simple for users and not display less chains than they have accounts for, for a given account number
    const accountNumberChainIds = Object.entries(
      accountIdsByAccountNumberAndChainId[selectedAccountNumber] ?? {},
    )
      .filter(([chainId]) => isEvmChainId(chainId))
      .map(([chainId]) => chainId)

    // Add any required chains from the dApp even if user doesn't have account/s at the current accountNumber for it/them - we'll handle that state ourselves
    // Rationale being, they should definitely be able to see the required chains when going to network selection regardless of whether or not they have an account for it
    const requiredFromNamespaces = Object.values(requiredNamespaces)
      .flatMap(namespace => namespace.chains ?? [])
      .filter(isEvmChainId)

    const allChainIds = uniq([...accountNumberChainIds, ...requiredFromNamespaces])

    // Always show required first
    const [required, rest] = partition(allChainIds, chainId => requiredChainIds.includes(chainId))

    return [...required, ...rest]
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

  const optionalChainIds = useMemo(() => {
    const userChainIds = Object.keys(
      accountIdsByAccountNumberAndChainId[selectedAccountNumber] ?? {},
    ).filter(isEvmChainId)

    return userChainIds.filter(chainId => !requiredChainIds.includes(chainId as ChainId))
  }, [selectedAccountNumber, accountIdsByAccountNumberAndChainId, requiredChainIds])

  const isAllOptionalChainsSelected = useMemo(() => {
    if (optionalChainIds.length === 0) return false
    return optionalChainIds.every(chainId => selectedChainIds.includes(chainId as ChainId))
  }, [optionalChainIds, selectedChainIds])

  const handleToggleAllChains = useCallback(() => {
    if (isAllOptionalChainsSelected) {
      const newSelectedChains = selectedChainIds.filter(chainId =>
        requiredChainIds.includes(chainId),
      )
      onSelectedChainIdsChange(newSelectedChains)
    } else {
      const userChainIds = Object.keys(
        accountIdsByAccountNumberAndChainId[selectedAccountNumber] ?? {},
      ).filter(isEvmChainId)
      onSelectedChainIdsChange(userChainIds as ChainId[])
    }
  }, [
    selectedAccountNumber,
    isAllOptionalChainsSelected,
    selectedChainIds,
    requiredChainIds,
    accountIdsByAccountNumberAndChainId,
    onSelectedChainIdsChange,
  ])

  const networkRows = useMemo(() => {
    const chainAdapterManager = getChainAdapterManager()

    return availableChainIds.map(chainId => {
      const typedChainId = chainId as ChainId
      const chainAdapter = chainAdapterManager.get(typedChainId)
      if (!chainAdapter) return null

      const feeAssetId = chainAdapter.getFeeAssetId()
      const feeAsset = feeAssetId ? assetsById[feeAssetId] : undefined
      const chainName = chainAdapter.getDisplayName()
      if (!chainName) return null

      const networkIcon = feeAsset?.networkIcon ?? feeAsset?.icon
      const hasAccount = Boolean(
        accountIdsByAccountNumberAndChainId[selectedAccountNumber]?.[typedChainId],
      )
      const isRequired = requiredChainIds.includes(typedChainId)
      const isDisabled = isRequired

      if (!networkIcon) return null
      if (!hasAccount && !isRequired) return null

      const content = (
        <Checkbox
          key={typedChainId}
          value={typedChainId}
          isDisabled={isDisabled}
          size='lg'
          colorScheme={isRequired ? 'gray' : 'blue'}
          sx={isRequired ? requiredCheckboxSx : checkboxSx}
          py={3}
          px={2}
          opacity={hasAccount ? 1 : 0.5}
          flexDirection='row-reverse'
          justifyContent='space-between'
          width='full'
          cursor={isDisabled ? 'not-allowed' : 'pointer'}
        >
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
          </HStack>
        </Checkbox>
      )

      if (!hasAccount) {
        return (
          <Tooltip
            key={typedChainId}
            label={translate('plugins.walletConnectToDapps.modal.noAccount', { chainName })}
            placement='top'
          >
            {content}
          </Tooltip>
        )
      }

      return content
    })
  }, [
    availableChainIds,
    assetsById,
    selectedAccountNumber,
    accountIdsByAccountNumberAndChainId,
    requiredChainIds,
    translate,
  ])

  return (
    <VStack spacing={0} align='stretch' h='full'>
      <DialogHeader>
        <DialogHeaderLeft>
          <DialogBackButton onClick={onBack} />
        </DialogHeaderLeft>
        <DialogHeaderMiddle>
          <DialogTitle>{translate('plugins.walletConnectToDapps.modal.chooseNetwork')}</DialogTitle>
        </DialogHeaderMiddle>
        <DialogHeaderRight justifyContent='flex-end'>
          <Button
            flexShrink={0}
            size='sm'
            variant='link'
            colorScheme='blue'
            onClick={handleToggleAllChains}
          >
            {isAllOptionalChainsSelected
              ? translate('common.unselectAll')
              : translate('common.selectAll')}
          </Button>
        </DialogHeaderRight>
      </DialogHeader>
      <CheckboxGroup value={selectedChainIds} onChange={handleChainIdsChange}>
        <VStack spacing={0} align='stretch' px={4} pb={4} flex={1}>
          {networkRows}
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
