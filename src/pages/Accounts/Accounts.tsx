import { Flex } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { Page } from 'components/Layout/Page'

export const Accounts = () => {
  // const history = useHistory()
  // const onClick = (asset: Asset) => {
  //   const url = asset.tokenId ? `/assets/${asset.chain}/${asset.tokenId}` : `/assets/${asset.chain}`
  //   history.push(url)
  // }
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
        <Link to='/accounts/eip155:1:0x32db2535b5963ddf17f9a2a83d1cd83969d1c595'>Click me</Link>
      </Flex>
    </Page>
  )
}
