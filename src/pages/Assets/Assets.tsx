import { Flex } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { useHistory } from 'react-router-dom'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { Page } from 'components/Layout/Page'

export const Assets = () => {
  const history = useHistory()
  const onClick = (asset: Asset) => {
    // CAIP19 has a `/` separator so the router will have to parse 2 variables
    // e.g., /assets/:chainId/:assetSubId
    const url = `/assets/${asset.caip19}`
    history.push(url)
  }
  return (
    <Page style={{ flex: 1 }}>
      <Flex
        role='main'
        flex={1}
        flexDir='column'
        maxWidth='2xl'
        mx='auto'
        height={{ base: 'calc(100vh - 128px)', md: 'calc(100vh - 64px)' }}
        px={4}
      >
        <AssetSearch onClick={onClick} />
      </Flex>
    </Page>
  )
}
