import { List } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import type MultiRef from 'react-multi-ref'
import { useTranslate } from 'react-polyglot'

import { ListItemSection } from '../ListItemSection'
import { AssetResult } from './AssetResult'

export type AssetResultsProps = {
  results: Asset[]
  activeIndex?: number
  startingIndex: number
  onClick: (arg: Asset) => void
  searchQuery?: string
  menuNodes: MultiRef<number, HTMLElement>
}

export const AssetResults: React.FC<AssetResultsProps> = ({
  results,
  activeIndex,
  onClick,
  startingIndex,
  searchQuery,
  menuNodes,
}) => {
  const translate = useTranslate()
  const renderItems = useMemo(() => {
    return results.map((asset, index) => (
      <AssetResult
        key={`result-assets-${index}`}
        index={index + startingIndex}
        activeIndex={activeIndex}
        asset={asset}
        onClick={onClick}
        ref={menuNodes.ref(index)}
      />
    ))
  }, [activeIndex, menuNodes, onClick, results, startingIndex])

  if (searchQuery && !results.length) return null
  return (
    <>
      <ListItemSection title={translate('navBar.assets')} />
      <List px={2}>{renderItems}</List>
    </>
  )
}
