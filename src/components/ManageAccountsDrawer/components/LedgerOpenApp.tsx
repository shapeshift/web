import { Button, Center, Flex, Spinner, useToast } from '@chakra-ui/react'
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
  ethAssetId,
  ethChainId,
  gnosisChainId,
  ltcChainId,
  optimismChainId,
  polygonChainId,
  thorchainChainId,
} from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { slip44Table } from '@shapeshiftoss/hdwallet-core'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { RawText, Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectAssetById, selectFeeAssetByChainId } from 'state/selectors'
import { useAppSelector } from 'state/store'

import { AssetOnLedger } from './AssetOnLedger'
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
  const toast = useToast()

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

  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const appName = useMemo(() => {
    if (isEvmChainId(chainId)) return ethAsset?.networkName
    return asset?.networkName
  }, [asset?.networkName, chainId, ethAsset?.networkName])
  const renderedAsset = useMemo(() => {
    if (isEvmChainId(chainId)) return ethAsset
    return asset
  }, [asset, chainId, ethAsset])

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
      toast({
        title: translate('walletProvider.ledger.errors.appNotOpen', { app: appName }),
        description: translate('walletProvider.ledger.errors.appNotOpenDescription', {
          app: appName,
        }),
        status: 'error',
        duration: 9000,
        isClosable: true,
        position: 'top-right',
      })
    }
  }, [appName, isCorrectAppOpen, onNext, toast, translate])

  const body = useMemo(() => {
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
  }, [appName, renderedAsset, translate])

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
