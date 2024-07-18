import { HStack, VStack } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetOnLedger } from 'components/LedgerOpenApp/components/AssetOnLedger'
import { useLedgerAppDetails } from 'components/LedgerOpenApp/hooks/useLedgerAppDetails'
import { useWaitForLedgerApp } from 'components/LedgerOpenApp/hooks/useWaitForLedgerApp'
import { RawText, Text } from 'components/Text'

type LedgerOpenAppAcknowledgementProps = {
  chainId: ChainId
}

export const useLedgerOpenApp = ({ chainId }: LedgerOpenAppAcknowledgementProps) => {
  const translate = useTranslate()
  const [shouldShowAcknowledgement, setShouldShowAcknowledgement] = useState(false)
  const [onReady, setOnReady] = useState<() => void>()

  useWaitForLedgerApp({ chainId, onReady })
  const { appName, appAsset } = useLedgerAppDetails(chainId)

  const checkLedgerApp = useCallback(() => {
    return new Promise<void>(resolve => {
      // If the ledger app is already open, resolve the promise immediately
      // Set a callback to resolve the promise when the Ledger app is open
      setOnReady(() => {
        return () => {
          setShouldShowAcknowledgement(false)
          resolve()
        }
      })

      // Display the request to open the Ledger app
      setShouldShowAcknowledgement(true)
    })
  }, [])

  const content = useMemo(() => {
    if (!shouldShowAcknowledgement || !appAsset) {
      return null
    }
    return (
      <HStack>
        <AssetOnLedger assetId={appAsset.assetId} size='md' />
        <VStack alignItems='left'>
          <RawText fontSize='md' fontWeight='bold' mt={10} mb={3}>
            {translate('accountManagement.ledgerOpenApp.title', {
              appName,
            })}
          </RawText>
          <Text translation='accountManagement.ledgerOpenApp.description' color='whiteAlpha.600' />
        </VStack>
      </HStack>
    )
  }, [appAsset, appName, shouldShowAcknowledgement, translate])

  return { content, checkLedgerApp }
}
