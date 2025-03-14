import { Button, Divider, Flex, Link, Tag } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { AssetIcon } from '@/components/AssetIcon'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { Row } from '@/components/Row/Row'
import { SanitizedHtml } from '@/components/SanitizedHtml/SanitizedHtml'
import { Text } from '@/components/Text'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { markdownLinkToHTML } from '@/lib/utils'
import { CopyButton } from '@/plugins/walletConnectToDapps/components/modals/CopyButton'
import { selectNftCollectionById } from '@/state/apis/nft/selectors'
import type { NftItem } from '@/state/apis/nft/types'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { useAppSelector } from '@/state/store'

type NftOverviewProps = {
  nftItem: NftItem
}

const ellipsisAddressHover = { bg: 'transparent' }

export const NftOverview: React.FC<NftOverviewProps> = ({ nftItem }) => {
  const translate = useTranslate()

  const collection = useAppSelector(state => selectNftCollectionById(state, nftItem?.collectionId))
  const description = nftItem.description || collection?.description || ''
  const tokenId = nftItem?.id
  const address = collection?.assetId && fromAssetId(collection.assetId).assetReference
  const chainId = collection?.chainId
  const { assetNamespace: nftStandard } = fromAssetId(collection?.assetId ?? '')
  const maybeChainAdapter = getChainAdapterManager().get(chainId as ChainId)
  const maybeFeeAssetId = maybeChainAdapter?.getFeeAssetId()
  const chainDisplayName = maybeChainAdapter?.getDisplayName()
  const maybeFeeAsset = useAppSelector(s => selectAssetById(s, maybeFeeAssetId ?? ''))
  const maybeExplorerLinkBase = maybeFeeAsset?.explorerAddressLink
  const maybeCollectionLink = `${maybeExplorerLinkBase}${address}`

  const handlellipsisAddressClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => e.stopPropagation(),
    [],
  )

  return (
    <Flex flexDir='column'>
      <Flex flexDir='column' gap={4} px={8} py={6}>
        <Text translation='nft.details' fontWeight='medium' />
        <Flex flexDir='column' gap={4}>
          <Row alignItems='center'>
            <Row.Label>{translate('nft.tokenId')}</Row.Label>
            <Flex gap={2} alignItems='center'>
              <Row.Value
                whiteSpace='nowrap'
                maxWidth='200px'
                overflow='hidden'
                textOverflow='ellipsis'
              >
                {tokenId}
              </Row.Value>
              <CopyButton value={tokenId} />
            </Flex>
          </Row>
          {address && (
            <Row>
              <Row.Label>{translate('nft.address')}</Row.Label>
              <Row.Value>
                <InlineCopyButton value={address}>
                  <Button
                    as={Link}
                    isExternal
                    href={maybeCollectionLink}
                    variant='ghost'
                    colorScheme='blue'
                    bg='transparent'
                    fontWeight='normal'
                    fontFamily='monospace'
                    onClick={handlellipsisAddressClick}
                    mt={1}
                    p={0}
                    height='auto'
                    fontSize='inherit'
                    _hover={ellipsisAddressHover}
                    display='flex'
                    alignItems='center'
                  >
                    <MiddleEllipsis value={address} />
                  </Button>
                </InlineCopyButton>
              </Row.Value>
            </Row>
          )}
          {chainDisplayName && (
            <Row>
              <Row.Label>{translate('nft.chain')}</Row.Label>
              <Row.Value display='flex' alignItems='center'>
                <AssetIcon
                  src={maybeFeeAsset?.networkIcon ?? maybeFeeAsset?.icon}
                  size='2xs'
                  mr={2}
                />{' '}
                {chainDisplayName}
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
            <SanitizedHtml color='text.subtle' dirtyHtml={markdownLinkToHTML(description)} />
          </Flex>
        </>
      )}
    </Flex>
  )
}
