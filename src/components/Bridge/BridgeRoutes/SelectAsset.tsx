import { ChevronRightIcon } from '@chakra-ui/icons'
import { Button, Circle, Stack } from '@chakra-ui/react'
import { AssetId, toAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useSelector } from 'react-redux'
import { RouteComponentProps } from 'react-router-dom'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { selectPortfolioBridgeAssets } from 'state/slices/portfolioSlice/selectors'

import { BridgeAsset, BridgeRoutePaths } from '../types'
import { WithBackButton } from './WithBackButton'

type AssetRowProps = {
  onClick: (arg: BridgeAsset) => void
} & BridgeAsset

const AssetRow: React.FC<AssetRowProps> = ({ onClick, ...rest }) => {
  const { symbol, icon, balance, implementations } = rest
  const chains = Object.keys(implementations ?? {})
  return (
    <Button
      variant='ghost'
      size='lg'
      justifyContent='space-between'
      fontSize='sm'
      onClick={() => onClick(rest)}
      rightIcon={<ChevronRightIcon boxSize={6} />}
    >
      <Stack direction='row' alignItems='center' width='full'>
        <AssetIcon src={icon} size='sm' />
        <Stack spacing={0} width='full' justifyContent='center' alignItems='flex-start'>
          <RawText>{symbol}</RawText>
          <RawText color='gray.500'>{`${balance} available`}</RawText>
        </Stack>
        {chains.length > 1 && (
          <Circle size={8} ml='auto' borderWidth={2} borderColor='gray.700'>
            <RawText>{chains.length}</RawText>
          </Circle>
        )}
      </Stack>
    </Button>
  )
}

type SelectAssetProps = {
  onClick: (asset: BridgeAsset) => void
} & RouteComponentProps

const getWrappedAxelarAssetIdOnAvalanche = (asset: AssetId): AssetId | undefined => {
  const chainId = KnownChainIds.AvalancheMainnet
  const assetNamespace = 'erc20'
  switch (asset) {
    // USDC on Ethereum
    case 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48':
      return toAssetId({
        chainId,
        assetNamespace,
        assetReference: '0xfaB550568C688d5D8A52C7d794cb93Edc26eC0eC',
      })
    default:
      return undefined
  }
}

export const SelectAsset: React.FC<SelectAssetProps> = ({ onClick, history }) => {
  const assets = useSelector(selectPortfolioBridgeAssets)
  const supportedAssets = assets.filter(asset => {
    return !!getWrappedAxelarAssetIdOnAvalanche(asset.assetId)
  })

  const handleBack = () => {
    history.push(BridgeRoutePaths.Input)
  }

  return (
    <SlideTransition>
      <Card variant='unstyled'>
        <Card.Header px={0} pt={0}>
          <WithBackButton handleBack={handleBack}>
            <Card.Heading textAlign='center'>
              <Text translation='bridge.selectAsset' />
            </Card.Heading>
          </WithBackButton>
        </Card.Header>
        <Card.Body p={0} height='400px' display='flex' flexDir='column'>
          <Stack>
            {supportedAssets.map(asset => (
              <AssetRow key={asset.assetId} onClick={onClick} {...asset} />
            ))}
          </Stack>
        </Card.Body>
      </Card>
    </SlideTransition>
  )
}
