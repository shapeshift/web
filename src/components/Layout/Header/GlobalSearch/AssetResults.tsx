import { ListItem } from '@chakra-ui/react'
import { useMemo } from 'react'
import { selectAssetsByMarketCap } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const AssetResults = () => {
  const assets = useAppSelector(selectAssetsByMarketCap)
  const firstTen = assets.slice(0, 10)
  const results = firstTen
  const renderItems = useMemo(() => {
    return results.map(asset => <ListItem>{asset.name}</ListItem>)
  }, [results])
  return (
    <>
      <ListItem tabIndex={-1}>Assets</ListItem>
      {renderItems}
    </>
  )
}
