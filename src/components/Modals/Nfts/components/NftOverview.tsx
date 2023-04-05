import { Flex, Tag } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { SupportedZapperNetwork } from 'state/apis/zapper/client'
import { ZAPPER_NETWORKS_TO_CHAIN_ID_MAP } from 'state/apis/zapper/client'
import { firstFourLastFour } from 'state/slices/portfolioSlice/utils'

import type { NftModalProps } from '../NftModal'

export const NftOverview: React.FC<NftModalProps> = ({ zapperNft }) => {
  const translate = useTranslate()

  const collection = zapperNft?.collection
  const tokenId = zapperNft?.tokenId
  const address = collection?.address
  const maybeNetwork = collection?.network
  const nftStandard = collection?.nftStandard

  const networkDisplayName = getChainAdapterManager()
    .get(ZAPPER_NETWORKS_TO_CHAIN_ID_MAP[maybeNetwork as SupportedZapperNetwork] as ChainId)
    ?.getDisplayName()

  return (
    <Flex flexDir='column'>
      <Flex flexDir='column' gap={4} px={8} py={6}>
        <Text translation='nft.details' fontWeight='medium' />
        <Flex flexDir='column' gap={4}>
          <Row>
            <Row.Label>{translate('nft.tokenId')}</Row.Label>
            <Row.Value>{tokenId}</Row.Value>
          </Row>
          {address && (
            <Row>
              <Row.Label>{translate('nft.address')}</Row.Label>
              <Row.Value>{firstFourLastFour(address)}</Row.Value>
            </Row>
          )}
          {networkDisplayName && (
            <Row>
              <Row.Label>{translate('nft.network')}</Row.Label>
              <Row.Value>{networkDisplayName}</Row.Value>
            </Row>
          )}
          <Row>
            <Row.Label>{translate('nft.standard')}</Row.Label>
            <Row.Value>
              <Tag
                whiteSpace='nowrap'
                colorScheme='blue'
                fontSize='small'
                fontWeight='bold'
                minHeight='auto'
                textTransform='uppercase'
                py={1}
              >
                {nftStandard}
              </Tag>
            </Row.Value>
          </Row>
        </Flex>
      </Flex>
      {/* <Divider />
      <Flex gap={4} flexDir='column' px={8} py={6}>
        <Text translation='nft.description' fontWeight='medium' />
        <RawText color='gray.500'>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
          ullamco laboris nisi ut aliquip{' '}
        </RawText>
      </Flex> */}
    </Flex>
  )
}
