import { List } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ListItemSection } from '../ListItemSection'

import { AssetList } from '@/components/AssetSearch/components/AssetList'
import { isContractAddress } from '@/lib/utils/isContractAddress'

export type AssetResultsProps = {
  results: Asset[]
  onClick: (arg: Asset) => void
  searchQuery?: string
}

export const AssetResults: React.FC<AssetResultsProps> = ({ results, onClick, searchQuery }) => {
  const translate = useTranslate()
  const showRelatedAssets = useMemo(() => !isContractAddress(searchQuery ?? ''), [searchQuery])
  const renderItems = useMemo(
    () => (
      <AssetList assets={results} handleClick={onClick} showRelatedAssets={showRelatedAssets} />
    ),
    [results, onClick, showRelatedAssets],
  )

  if (searchQuery && !results.length) return null
  return (
    <>
      <ListItemSection title={translate('navBar.assets')} />
      <List px={2}>{renderItems}</List>
    </>
  )
}
