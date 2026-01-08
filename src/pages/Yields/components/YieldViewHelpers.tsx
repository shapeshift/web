import { Box, ButtonGroup, Flex, IconButton } from '@chakra-ui/react'
import { memo, useCallback, useMemo } from 'react'
import { FaList, FaThLarge } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

const gridIcon = <FaThLarge />
const listIcon = <FaList />

type ViewToggleProps = {
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void
}

export const ViewToggle = memo(({ viewMode, setViewMode }: ViewToggleProps) => {
  const isGridActive = useMemo(() => viewMode === 'grid', [viewMode])
  const isListActive = useMemo(() => viewMode === 'list', [viewMode])

  const handleSetGridView = useCallback(() => setViewMode('grid'), [setViewMode])
  const handleSetListView = useCallback(() => setViewMode('list'), [setViewMode])

  return (
    <Flex justify='flex-end'>
      <ButtonGroup size='md' isAttached variant='outline'>
        <IconButton
          aria-label='Grid View'
          icon={gridIcon}
          onClick={handleSetGridView}
          isActive={isGridActive}
        />
        <IconButton
          aria-label='List View'
          icon={listIcon}
          onClick={handleSetListView}
          isActive={isListActive}
        />
      </ButtonGroup>
    </Flex>
  )
})

const typeDisplayStyle = { base: 'none', lg: 'block' }
const tvlDisplayStyle = { base: 'none', md: 'block' }

type ListHeaderProps = {
  isGroup?: boolean
}

export const ListHeader = memo(({ isGroup = true }: ListHeaderProps) => {
  const translate = useTranslate()

  const assetText = useMemo(() => translate('yieldXYZ.asset') ?? 'Asset', [translate])
  const apyText = useMemo(
    () => (isGroup ? translate('yieldXYZ.maxApy') : translate('yieldXYZ.apy')),
    [translate, isGroup],
  )
  const tvlText = useMemo(() => translate('yieldXYZ.tvl'), [translate])
  const balanceText = useMemo(() => translate('yieldXYZ.myBalance'), [translate])
  const providerText = useMemo(
    () => (isGroup ? translate('yieldXYZ.providers') : translate('yieldXYZ.provider')),
    [translate, isGroup],
  )

  return (
    <Flex
      px={4}
      py={2}
      color='text.subtle'
      fontSize='xs'
      textTransform='uppercase'
      letterSpacing='wider'
    >
      <Box flex={2} minW='200px'>
        {assetText}
      </Box>
      <Box flex={1}>{apyText}</Box>
      <Box flex={1} display={tvlDisplayStyle}>
        {tvlText}
      </Box>
      <Box flex={1} display={tvlDisplayStyle}>
        {balanceText}
      </Box>
      <Box flex={1} display={typeDisplayStyle} textAlign='right'>
        {providerText}
      </Box>
    </Flex>
  )
})
