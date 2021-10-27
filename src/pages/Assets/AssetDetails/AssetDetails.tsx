import { Flex, Stack } from '@chakra-ui/react'
import { BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'
import { useEffect, useState } from 'react'
import { Page } from 'components/Layout/Page'
import { AssetMarketData } from 'hooks/useAsset/useAsset'

import { AssetHeader } from './AssetHeader/AssetHeader'
import { AssetHistory } from './AssetHistory'
type AssetDetailProps = {
  asset: AssetMarketData
  isLoaded: boolean
}

export const AssetDetails = ({ asset, isLoaded }: AssetDetailProps) => {
  const [currentScriptType, setCurrentScriptType] = useState<BTCInputScriptType | undefined>(
    BTCInputScriptType.SpendWitness
  )

  useEffect(() => {
    if (asset.symbol === 'BTC') setCurrentScriptType(BTCInputScriptType.SpendWitness)
    else setCurrentScriptType(undefined)
  }, [asset.symbol])

  return (
    <Page style={{ width: '100%' }}>
      <Flex flexGrow={1} zIndex={2} flexDir={{ base: 'column', lg: 'row' }}>
        <Stack
          spacing='1.5rem'
          maxWidth={{ base: 'auto', lg: '50rem' }}
          flexBasis='50rem'
          p={{ base: 0, lg: 4 }}
          mx={{ base: 0, lg: 'auto' }}
        >
          <AssetHeader
            asset={asset}
            isLoaded={isLoaded}
            currentScriptType={currentScriptType}
            setCurrentScriptType={setCurrentScriptType}
          />
          <AssetHistory asset={asset} currentScriptType={currentScriptType} />
        </Stack>
      </Flex>
    </Page>
  )
}
