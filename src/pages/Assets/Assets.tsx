import { Flex } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/asset-service'
import { useHistory } from 'react-router-dom'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { Page } from 'components/Layout/Page'

export const Assets = () => {
  const history = useHistory()
  const onClick = (asset: Asset) => {
    history.push(`/assets/ethereum/${asset.tokenId}`)
  }
  return (
    <Page style={{ flex: 1 }}>
      <Flex role='main' flex={1} flexDir='column' height='calc(100vh - 64px)' px={4}>
        <AssetSearch onClick={onClick} />
      </Flex>
    </Page>
  )
}
