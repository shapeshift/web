import { Button, Circle, Stack } from '@chakra-ui/react'
import { useFormContext, useWatch } from 'react-hook-form'
import type { RouteComponentProps } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'

import type { BridgeChain, BridgeState } from '../types'
import { BridgeRoutePaths } from '../types'
import { WithBackButton } from './WithBackButton'

type SelectAssetProps = {
  onClick: (asset: BridgeChain) => void
} & RouteComponentProps

export const SelectChain: React.FC<SelectAssetProps> = ({ onClick, history }) => {
  const handleBack = () => {
    history.push(BridgeRoutePaths.Input)
  }
  const { control } = useFormContext<BridgeState>()
  const bridgeAsset = useWatch({ control, name: 'asset' })
  const implementations = bridgeAsset?.implementations
  const chains = Object.keys(bridgeAsset?.implementations ?? {})

  if (!implementations) return null

  return (
    <SlideTransition>
      <Card variant='unstyled'>
        <Card.Header px={0} pt={0}>
          <WithBackButton handleBack={handleBack}>
            <Card.Heading textAlign='center'>
              <Text translation='bridge.selectChain' />
            </Card.Heading>
          </WithBackButton>
        </Card.Header>
        <Card.Body p={0} height='400px' display='flex' flexDir='column'>
          <Stack width='full'>
            {chains.map(chainName => {
              const chain = implementations[chainName]
              return (
                <Stack
                  as={Button}
                  size='lg'
                  key={chainName}
                  variant='ghost'
                  direction='row'
                  width='full'
                  alignItems='center'
                  justifyContent='space-between'
                  onClick={() => onClick(chain)}
                >
                  <Stack direction='row' fontSize='md' alignItems='center'>
                    <Circle size={8} borderWidth={2} borderColor={chain.color} />
                    <RawText textTransform='capitalize'>{chainName}</RawText>
                  </Stack>
                  <Stack spacing={0} ml='auto' alignItems='flex-end' fontSize='sm'>
                    <Amount.Fiat value={chain.fiatBalance} />
                    <Amount.Crypto color='gray.500' value={chain.balance} symbol={chain.symbol} />
                  </Stack>
                </Stack>
              )
            })}
          </Stack>
        </Card.Body>
      </Card>
    </SlideTransition>
  )
}
