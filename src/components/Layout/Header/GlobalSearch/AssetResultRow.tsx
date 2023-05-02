import { Button, Flex } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { Amount } from 'components/Amount/Amount'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { RawText } from 'components/Text'
import type { GlobalSearchResult } from 'state/slices/search-selectors'
import { GlobalSearchResultType } from 'state/slices/search-selectors'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AssetResultProps = {
  assetId: AssetId
  index: number
  activeIndex?: number
  onClick: (arg: GlobalSearchResult) => void
}

export const AssetResult: React.FC<AssetResultProps> = ({
  assetId,
  index,
  activeIndex,
  onClick,
}) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const selected = index === activeIndex
  if (!asset) return null
  return (
    <Button
      display='grid'
      gridTemplateColumns='50% 1fr'
      alignItems='center'
      variant='ghost'
      py={2}
      height='auto'
      width='full'
      aria-selected={selected ? true : undefined}
      _selected={{ bg: 'whiteAlpha.100' }}
      onClick={() => onClick({ type: GlobalSearchResultType.Asset, id: assetId })}
    >
      <Flex gap={2} flex={1}>
        <LazyLoadAvatar src={asset.icon} />
        <Flex flexDir='column' alignItems='flex-start' textAlign='left'>
          <RawText
            color='chakra-body-text'
            width='100%'
            textOverflow='ellipsis'
            overflow='hidden'
            whiteSpace='nowrap'
          >
            {asset.name}
          </RawText>
          <RawText size='xs' variant='sub-text'>
            {asset.symbol}
          </RawText>
        </Flex>
      </Flex>
      <Flex flexDir='column' alignItems='flex-end'>
        <Amount.Fiat value='100' />
        <Amount.Crypto size='xs' variant='sub-text' value='100' symbol={asset.symbol} />
      </Flex>
    </Button>
  )
}
