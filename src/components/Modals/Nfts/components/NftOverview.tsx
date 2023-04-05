import { Button, Divider, Flex, Link, Tag } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { ParsedHtml } from 'components/ParsedHtml/ParsedHtml'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { markdownLinkToHTML } from 'lib/utils'
import type {
  SupportedZapperNetwork,
  V2NftCollectionType,
  V2ZapperNft,
} from 'state/apis/zapper/client'
import { ZAPPER_NETWORKS_TO_CHAIN_ID_MAP } from 'state/apis/zapper/client'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { useAppSelector } from 'state/store'

type NftOverviewProps = {
  zapperNft: V2ZapperNft
  zapperCollection?: V2NftCollectionType[]
}

export const NftOverview: React.FC<NftOverviewProps> = ({ zapperCollection, zapperNft }) => {
  const translate = useTranslate()

  const description = zapperCollection?.[0]?.collection.description
  const collection = zapperNft?.collection
  const tokenId = zapperNft?.tokenId
  const address = collection?.address
  const maybeNetwork = collection?.network
  const nftStandard = collection?.nftStandard
  const maybeChainId = ZAPPER_NETWORKS_TO_CHAIN_ID_MAP[maybeNetwork as SupportedZapperNetwork]
  const maybeChainAdapter = getChainAdapterManager().get(maybeChainId as ChainId)
  const maybeFeeAssetId = maybeChainAdapter?.getFeeAssetId()
  const chainDisplayName = maybeChainAdapter?.getDisplayName()
  const maybeFeeAsset = useAppSelector(s => selectAssetById(s, maybeFeeAssetId ?? ''))
  const maybeExplorerLinkBase = maybeFeeAsset?.explorerAddressLink
  const maybeCollectionLink = `${maybeExplorerLinkBase}${address}`

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
              <Row.Value>
                <Button
                  as={Link}
                  isExternal
                  href={maybeCollectionLink}
                  variant='ghost'
                  colorScheme='blue'
                  bg='transparent'
                  fontWeight='normal'
                  fontFamily='monospace'
                  onClick={e => e.stopPropagation()}
                  mt={1}
                  p={0}
                  height='auto'
                  fontSize='inherit'
                  _hover={{ bg: 'transparent' }}
                  display='flex'
                  alignItems='center'
                >
                  <MiddleEllipsis value={address} />
                </Button>
              </Row.Value>
            </Row>
          )}
          {chainDisplayName && (
            <Row>
              <Row.Label>{translate('nft.chain')}</Row.Label>
              <Row.Value display='flex' alignItems='center'>
                <AssetIcon src={maybeFeeAsset?.icon} size='2xs' mr={2} /> {chainDisplayName}
              </Row.Value>
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
      {description && (
        <>
          <Divider />
          <Flex gap={4} flexDir='column' px={8} py={6}>
            <Text translation='nft.description' fontWeight='medium' />
            <RawText color='gray.500'>
              <ParsedHtml innerHtml={markdownLinkToHTML(description)} />
            </RawText>
          </Flex>
        </>
      )}
    </Flex>
  )
}
