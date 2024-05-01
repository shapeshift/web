import { Button, Center, Flex } from '@chakra-ui/react'
import {
  arbitrumChainId,
  arbitrumNovaChainId,
  avalancheChainId,
  bchChainId,
  binanceChainId,
  bscChainId,
  btcChainId,
  type ChainId,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  gnosisChainId,
  ltcChainId,
  optimismChainId,
  polygonChainId,
  thorchainChainId,
} from '@shapeshiftoss/caip'
import type { slip44Table } from '@shapeshiftoss/hdwallet-core'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetOnLedger } from 'components/AssetIcon'
import { RawText, Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectFeeAssetByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DrawerContentWrapper } from './DrawerContent'

export type LedgerOpenAppProps = {
  chainId: ChainId
  onClose: () => void
  onNext: () => void
}

type Slip44Key = keyof typeof slip44Table
const getSlip44KeyFromChainId = (chainId: ChainId): Slip44Key | undefined => {
  switch (chainId) {
    // UTXO chains
    case btcChainId:
      return 'Bitcoin'
    case dogeChainId:
      return 'Dogecoin'
    case bchChainId:
      return 'BitcoinCash'
    case ltcChainId:
      return 'Litecoin'
    // EVM chains
    case ethChainId:
      return 'Ethereum'
    case avalancheChainId:
      return 'Avalanche'
    case optimismChainId:
      return 'Optimism'
    case bscChainId:
      return 'BnbSmartChain'
    case polygonChainId:
      return 'Polygon'
    case gnosisChainId:
      return 'Gnosis'
    case arbitrumChainId:
      return 'Arbitrum'
    case arbitrumNovaChainId:
      return 'ArbitrumNova'
    // Cosmos chains
    case thorchainChainId:
      return 'Rune'
    case cosmosChainId:
      return 'Atom'
    case binanceChainId:
      return 'Binance'
    default:
      return undefined
  }
}

export const LedgerOpenApp = ({ chainId, onClose, onNext }: LedgerOpenAppProps) => {
  const translate = useTranslate()
  const asset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))
  const wallet = useWallet().state.wallet

  const slip44Key = getSlip44KeyFromChainId(chainId)
  const isCorrectAppOpen = useCallback(async () => {
    const ledgerWallet = wallet && isLedger(wallet) ? wallet : undefined
    if (!ledgerWallet || !slip44Key) return false
    try {
      await ledgerWallet.validateCurrentApp(slip44Key)
      return true
    } catch (error) {
      console.error(error)
      return false
    }
  }, [wallet, slip44Key])

  useEffect(() => {
    // Poll the Ledger every second to see if the correct app is open
    const intervalId = setInterval(async () => {
      const isValidApp = await isCorrectAppOpen()
      if (isValidApp) {
        clearInterval(intervalId)
        onNext()
      }
    }, 1000)

    return () => clearInterval(intervalId) // Clean up on component unmount
  }, [isCorrectAppOpen, onNext])

  const maybeNext = useCallback(async () => {
    const isValidApp = await isCorrectAppOpen()
    if (isValidApp) {
      onNext()
    } else {
      console.error('Correct Ledger app is not open', slip44Key)
    }
  }, [isCorrectAppOpen, onNext, slip44Key])

  const body = useMemo(() => {
    if (!asset) return null
    return (
      <Center>
        <Flex direction='column' justifyContent='center'>
          <AssetOnLedger assetId={asset.assetId} size={'xl'} />
          <RawText fontSize={'xl'} fontWeight={'bold'} mt={10} mb={3}>
            {translate('accountManagement.ledgerOpenApp.title', {
              chainNamespaceDisplayName: asset?.networkName ?? '',
            })}
          </RawText>
          <Text
            translation={'accountManagement.ledgerOpenApp.description'}
            color={'whiteAlpha.600'}
          />
        </Flex>
      </Center>
    )
  }, [asset, translate])

  return (
    <DrawerContentWrapper
      body={body}
      footer={
        <>
          <Button colorScheme='gray' mr={3} onClick={onClose}>
            {translate('common.cancel')}
          </Button>
          <Button colorScheme='blue' onClick={maybeNext}>
            {translate('common.next')}
          </Button>
        </>
      }
    />
  )
}
