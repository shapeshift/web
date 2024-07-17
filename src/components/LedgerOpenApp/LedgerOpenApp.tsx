import { Center, Flex, Spinner } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useWaitForLedgerApp } from 'components/LedgerOpenApp/hooks/useWaitForLedgerApp'
import { RawText, Text } from 'components/Text'
import { selectAssetById, selectFeeAssetByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetOnLedger } from './components/AssetOnLedger'

export type LedgerOpenAppProps = {
  chainId: ChainId
  onReady: () => void
}

export const LedgerOpenApp = ({ chainId, onReady }: LedgerOpenAppProps) => {
  const translate = useTranslate()
  const asset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))

  useWaitForLedgerApp({ chainId, onReady })

  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const appName = useMemo(() => {
    if (isEvmChainId(chainId)) return ethAsset?.networkName
    return asset?.networkName
  }, [asset?.networkName, chainId, ethAsset?.networkName])
  const renderedAsset = useMemo(() => {
    if (isEvmChainId(chainId)) return ethAsset
    return asset
  }, [asset, chainId, ethAsset])

  if (!renderedAsset) return null
  return (
    <Center>
      <Flex direction='column' justifyContent='center'>
        <AssetOnLedger assetId={renderedAsset.assetId} size={'xl'} />
        <RawText fontSize={'xl'} fontWeight={'bold'} mt={10} mb={3}>
          {translate('accountManagement.ledgerOpenApp.title', {
            appName,
          })}
        </RawText>
        <Text
          translation={'accountManagement.ledgerOpenApp.description'}
          color={'whiteAlpha.600'}
        />
        <Center>
          <Spinner mt={10} speed='0.65s' size={'xxl'} thickness='8px' />
        </Center>
      </Flex>
    </Center>
  )
}
