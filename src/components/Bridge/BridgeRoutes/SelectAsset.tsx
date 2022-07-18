import { ChevronRightIcon } from '@chakra-ui/icons'
import { Button, Circle, Stack } from '@chakra-ui/react'
import { RouteComponentProps } from 'react-router-dom'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'

import { BridgeAsset, BridgeRoutePaths } from '../types'
import { WithBackButton } from './WithBackButton'

const assets = [
  {
    assetId: '1',
    symbol: 'WAVAX',
    balance: '1000',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0x85f138bfEE4ef8e540890CFb48F620571d67Eda3/logo.png',
    implmentations: {
      avalanche: {
        name: 'Avalanche',
        balance: '1000',
        fiatBalance: '2510.00',
        color: '#E84142',
      },
      ethereum: {
        name: 'Ethereum',
        balance: '0',
        fiatBalance: '0',
        color: '#627EEA',
      },
    },
  },
  {
    assetId: '2',
    symbol: 'ATOM',
    icon: 'https://assets.coincap.io/assets/icons/256/atom.png',
    balance: '14.1245',
  },
  {
    assetId: '3',
    symbol: 'OSMOSIS',
    balance: '20.2988',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/osmosis/info/logo.png',
  },
  {
    assetId: '4',
    symbol: 'USDC',
    balance: '10.299',
    icon: 'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0x566957eF80F9fd5526CD2BEF8BE67035C0b81130/logo.png',
  },
]

type AssetRowProps = {
  onClick: (arg: BridgeAsset) => void
} & BridgeAsset

const AssetRow: React.FC<AssetRowProps> = ({ onClick, ...rest }) => {
  const { symbol, icon, balance, implmentations } = rest
  const chains = Object.keys(implmentations ?? {})
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

export const SelectAsset: React.FC<SelectAssetProps> = ({ onClick, history }) => {
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
            {assets.map(asset => (
              <AssetRow key={asset.assetId} onClick={onClick} {...asset} />
            ))}
          </Stack>
        </Card.Body>
      </Card>
    </SlideTransition>
  )
}
