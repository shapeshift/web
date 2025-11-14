import { CheckIcon } from '@chakra-ui/icons'
import { Box, Flex, Icon, MenuItemOption, MenuOptionGroup } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { Text } from '@/components/Text'
import type { MarketsCategories } from '@/pages/Markets/constants'
import { useRows } from '@/pages/Markets/hooks/useRows'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { store } from '@/state/store'

const checkedIcon = <Icon as={CheckIcon} color='blue.200' fontSize='20px' />

type ChainOptionGroupProps = {
  selectedCategory: MarketsCategories
  selectedChainId: ChainId | 'all'
  handleChainChange: (chainId: ChainId | 'all') => void
}

export const ChainOptionGroup = ({
  selectedCategory,
  selectedChainId,
  handleChainChange,
}: ChainOptionGroupProps) => {
  const translate = useTranslate()
  const rows = useRows({ limit: 10 })

  const options = useMemo(() => {
    return rows[selectedCategory]?.supportedChainIds?.map(chainId => {
      const feeAsset = selectFeeAssetByChainId(store.getState(), chainId)

      return (
        <MenuItemOption
          key={chainId}
          value={chainId}
          onClick={() => handleChainChange(chainId)}
          fontSize='md'
          iconPlacement='end'
          icon={checkedIcon}
          fontWeight='bold'
          color={selectedChainId === chainId ? 'text.primary' : 'text.subtle'}
        >
          <Flex alignItems='center' gap={2}>
            <LazyLoadAvatar src={feeAsset?.networkIcon ?? feeAsset?.icon} size='xs' />
            {feeAsset?.networkName ?? feeAsset?.name}
          </Flex>
        </MenuItemOption>
      )
    })
  }, [rows, selectedCategory, selectedChainId, handleChainChange])

  return (
    <>
      <Text translation='common.network' mb={2} color='text.primary' fontWeight='bold' />
      <Box backgroundColor='background.surface.raised.base' borderRadius='10' p={2} mb={4}>
        <MenuOptionGroup type='radio' value={selectedChainId}>
          <MenuItemOption
            value={'all'}
            onClick={() => handleChainChange('all')}
            fontSize='md'
            iconPlacement='end'
            icon={checkedIcon}
            fontWeight='bold'
            color={selectedChainId === 'all' ? 'text.primary' : 'text.subtle'}
            isChecked={selectedChainId === 'all'}
          >
            {translate('common.allChains')}
          </MenuItemOption>
          {options}
        </MenuOptionGroup>
      </Box>
    </>
  )
}
