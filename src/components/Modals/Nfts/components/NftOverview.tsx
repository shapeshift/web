import { Divider, Flex } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'

export const NftOverview = () => {
  const translate = useTranslate()
  return (
    <Flex flexDir='column'>
      <Flex flexDir='column' gap={4} px={8} py={6}>
        <Text translation='nft.details' fontWeight='medium' />
        <Flex flexDir='column' gap={4}>
          <Row>
            <Row.Label>{translate('nft.tokenId')}</Row.Label>
            <Row.Value>1245</Row.Value>
          </Row>
          <Row>
            <Row.Label>{translate('nft.address')}</Row.Label>
            <Row.Value>1245</Row.Value>
          </Row>
          <Row>
            <Row.Label>{translate('nft.network')}</Row.Label>
            <Row.Value>1245</Row.Value>
          </Row>
          <Row>
            <Row.Label>{translate('nft.standard')}</Row.Label>
            <Row.Value>1245</Row.Value>
          </Row>
        </Flex>
      </Flex>
      <Divider />
      <Flex gap={4} flexDir='column' px={8} py={6}>
        <Text translation='nft.description' fontWeight='medium' />
        <RawText color='gray.500'>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
          ullamco laboris nisi ut aliquip{' '}
        </RawText>
      </Flex>
    </Flex>
  )
}
