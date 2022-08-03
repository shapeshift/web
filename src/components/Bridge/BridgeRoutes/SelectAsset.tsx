import { ChevronRightIcon } from '@chakra-ui/icons'
import { Button, Circle, Stack } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import { useSelector } from 'react-redux'
import { RouteComponentProps } from 'react-router-dom'
import { AssetIcon } from 'components/AssetIcon'
import {
  chainIdToChainName,
  getBridgeDestinationAsset,
  unwrapAxelarAssetIdFromAvalancheToEthereum,
} from 'components/Bridge/utils'
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
  const { icon, cryptoAmount, implementations, assetId } = rest
  const { chainId } = fromAssetId(assetId)
  const chains = Object.keys(implementations ?? {})
  const chainName = chainIdToChainName(chainId)
  const symbol = implementations?.[chainName.toLowerCase()].symbol ?? ''
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
          <RawText>{`${symbol} on ${chainName}`}</RawText>
          <RawText color='gray.500'>{`${cryptoAmount} available`}</RawText>
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

export const SelectAsset: React.FC<SelectAssetProps> = ({ onClick, history }) => {
  const assets = useSelector(selectPortfolioBridgeAssets)
  const supportedAssets = assets
    .filter(asset => !!getBridgeDestinationAsset(asset.assetId))
    .map(filteredAsset => {
      const destinationAssetId = getBridgeDestinationAsset(filteredAsset.assetId)
      const destinationAsset = assets.find(a => a.assetId === destinationAssetId)
      console.log('destinationAsset', destinationAsset)
      const maybeUnwrappedAsset = unwrapAxelarAssetIdFromAvalancheToEthereum(filteredAsset.assetId)
      const implementations = maybeUnwrappedAsset
        ? {
            avalanche: {
              name: 'Avalanche',
              balance: filteredAsset.cryptoAmount,
              fiatBalance: filteredAsset.fiatAmount,
              symbol: filteredAsset.symbol,
              color: '#E84142',
            },
            ethereum: {
              name: 'Ethereum',
              balance: destinationAsset?.cryptoAmount ?? '0',
              fiatBalance: destinationAsset?.fiatAmount ?? '0',
              symbol: destinationAsset?.symbol ?? '',
              color: '#627EEA',
            },
          }
        : {
            avalanche: {
              name: 'Avalanche',
              balance: destinationAsset?.cryptoAmount ?? '0',
              fiatBalance: destinationAsset?.fiatAmount ?? '0',
              symbol: destinationAsset?.symbol ?? '',
              color: '#E84142',
            },
            ethereum: {
              name: 'Ethereum',
              balance: filteredAsset.cryptoAmount,
              fiatBalance: filteredAsset.fiatAmount,
              symbol: filteredAsset.symbol,
              color: '#627EEA',
            },
          }

      return {
        ...filteredAsset,
        implementations,
      }
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
