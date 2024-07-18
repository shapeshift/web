import { Center, Flex, Spinner } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { useWaitForLedgerApp } from 'components/LedgerOpenApp/hooks/useWaitForLedgerApp'
import { RawText, Text } from 'components/Text'

import { AssetOnLedger } from './components/AssetOnLedger'
import { useLedgerAppDetails } from './hooks/useLedgerAppDetails'

export type LedgerOpenAppProps = {
  chainId: ChainId
  onReady: (() => void) | undefined
}

export const LedgerOpenApp = ({ chainId, onReady }: LedgerOpenAppProps) => {
  const translate = useTranslate()
  useWaitForLedgerApp({ chainId, onReady })
  const { appName, appAsset } = useLedgerAppDetails(chainId)

  if (!appAsset) return null

  return (
    <Center>
      <Flex direction='column' justifyContent='center'>
        <AssetOnLedger assetId={appAsset.assetId} size={'xl'} />
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
