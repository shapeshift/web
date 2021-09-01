import { Flex } from '@chakra-ui/react'
import { SwapCurrency } from '@shapeshiftoss/market-service'
import { AssetSearch } from 'components/AssetSearch/AssetSearch'
import { Page } from 'components/Layout/Page'
import { useHistory } from 'react-router-dom'

export const Assets = () => {
  const history = useHistory()
  const onClick = (asset: SwapCurrency) => {
    history.push(`/assets/ethereum/${asset.address}`)
  }
  return (
    <Page style={{ flex: 1 }}>
      <Flex role='main' flex={1} flexDir='column' height='calc(100vh - 64px)' px={4}>
        <AssetSearch onClick={onClick} />
      </Flex>
    </Page>
  )
}
