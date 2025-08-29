import { List } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { ListItemSection } from '../ListItemSection'

import { AssetList } from '@/components/AssetSearch/components/AssetList'

export type AssetResultsProps = {
  results: Asset[]
  onClick: (arg: Asset) => void
  searchQuery?: string
}

export const AssetResults: React.FC<AssetResultsProps> = ({ results, onClick, searchQuery }) => {
  const translate = useTranslate()
  const renderItems = useMemo(() => {
    return <AssetList assets={results} handleClick={onClick} shouldDisplayRelatedAssets />
  }, [results, onClick])

  if (searchQuery && !results.length) return null
  return (
    <>
      <ListItemSection title={translate('navBar.assets')} />
      <List px={2}>{renderItems}</List>
    </>
  )
}
