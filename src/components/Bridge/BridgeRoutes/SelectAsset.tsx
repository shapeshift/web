import { ChevronRightIcon } from '@chakra-ui/icons'
import { Button, Circle, Stack } from '@chakra-ui/react'
import { fromAssetId } from '@keepkey/caip'
import { useSelector } from 'react-redux'
import type { RouteComponentProps } from 'react-router-dom'
import { AssetIcon } from 'components/AssetIcon'
import {
  chainIdToChainName,
  getBridgeDestinationAsset,
  unwrapAxelarAssetIdFromAvalancheToEthereum,
} from 'components/Bridge/utils'
import { Card } from 'components/Card/Card'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import { selectPortfolioBridgeAssets } from 'state/slices/portfolioSlice/selectors'

import type { BridgeAsset } from '../types'
import { AxelarChainNames, BridgeRoutePaths } from '../types'
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
  // FIXME: clean up - this whole section is utter garbage
  const portfolioAssets = useSelector(selectPortfolioBridgeAssets)
  const allAssets = useSelector(selectAssets)
  const supportedAssets: BridgeAsset[] = portfolioAssets
    .filter(asset => !!getBridgeDestinationAsset(asset.assetId))
    .map<BridgeAsset>(filteredAsset => {
      const destinationAssetId = getBridgeDestinationAsset(filteredAsset.assetId)
      const destinationAsset = destinationAssetId ? allAssets[destinationAssetId] : undefined
      const destinationBridgeAsset = portfolioAssets.find(a => a.assetId === destinationAssetId)
      const maybeUnwrappedAsset = unwrapAxelarAssetIdFromAvalancheToEthereum(filteredAsset.assetId)
      // FIXME: Lord have mercy
      const implementations = maybeUnwrappedAsset
        ? {
            avalanche: {
              name: AxelarChainNames.Avalanche,
              balance: filteredAsset.cryptoAmount,
              fiatBalance: filteredAsset.fiatAmount,
              symbol: filteredAsset.symbol,
              color: '#E84142',
            },
            ethereum: {
              name: AxelarChainNames.Ethereum,
              balance: destinationBridgeAsset ? destinationBridgeAsset.cryptoAmount : '0',
              fiatBalance: destinationBridgeAsset ? destinationBridgeAsset.fiatAmount : '0',
              symbol: destinationAsset?.symbol ?? '',
              color: '#627EEA',
            },
          }
        : {
            avalanche: {
              name: AxelarChainNames.Avalanche,
              balance: destinationBridgeAsset ? destinationBridgeAsset.cryptoAmount : '0',
              fiatBalance: destinationBridgeAsset ? destinationBridgeAsset.fiatAmount : '0',
              symbol: destinationAsset?.symbol ?? '',
              color: '#E84142',
            },
            ethereum: {
              name: AxelarChainNames.Ethereum,
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
            {supportedAssets.length ? (
              supportedAssets.map(asset => (
                <AssetRow key={asset.assetId} onClick={onClick} {...asset} />
              ))
            ) : (
              <Text translation='bridge.noSupportedAssets' />
            )}
          </Stack>
        </Card.Body>
      </Card>
    </SlideTransition>
  )
}
