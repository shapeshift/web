import {
  Box,
  Button,
  CardBody,
  CardFooter,
  Collapse,
  HStack,
  useDisclosure,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { selectEquityTotalBalance } from 'state/slices/selectors'
import { selectLastHop, selectLastHopSellAccountId } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { TwirlyToggle } from '../TwirlyToggle'

export type TradeSuccessProps = { handleBack: () => void; children: JSX.Element }

export const TradeSuccess = ({ handleBack, children }: TradeSuccessProps) => {
  const translate = useTranslate()
  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const { isOpen, onToggle } = useDisclosure({
    defaultIsOpen: false,
  })

  const lastHop = useAppSelector(selectLastHop)
  const lastHopSellAssetAccountId = useAppSelector(selectLastHopSellAccountId)

  const filter = useMemo(() => {
    return {
      assetId: lastHop?.buyAsset.assetId,
      ...(lastHopSellAssetAccountId ? { accountId: lastHopSellAssetAccountId } : {}),
    }
  }, [lastHop?.buyAsset.assetId, lastHopSellAssetAccountId])

  const { amountCryptoPrecision: totalCryptoHumanBalance, fiatAmount: totalFiatBalance } =
    useAppSelector(state => selectEquityTotalBalance(state, filter))

  const subText = useMemo(() => {
    if (!lastHop) return ''

    const manager = getChainAdapterManager()
    const adapter = manager.get(lastHop.buyAsset.chainId)

    if (!adapter) return ''

    const cryptoAmountFormatted = toCrypto(totalCryptoHumanBalance, lastHop.buyAsset.symbol)
    const chainName = adapter.getDisplayName()

    return translate('trade.tradeComplete', {
      cryptoAmountFormatted,
      chainName,
    })
  }, [lastHop, toCrypto, totalCryptoHumanBalance, translate])

  if (!lastHop) return null

  return (
    <>
      <CardBody pb={0} px={0}>
        <SlideTransition>
          <Box textAlign='center' py={4}>
            <AssetIcon assetId={lastHop.buyAsset.assetId} />
            <Amount.Crypto
              fontSize='2xl'
              fontWeight='semibold'
              value={totalCryptoHumanBalance}
              symbol={lastHop.buyAsset.symbol}
            />
            <Amount.Fiat color='gray.500' fontSize='lg' value={totalFiatBalance} lineHeight={1} />
            <RawText fontSize='md' color='gray.500' mt={2}>
              {subText}
            </RawText>
          </Box>
        </SlideTransition>
      </CardBody>
      <CardFooter flexDir='column' gap={2} px={4}>
        <SlideTransition>
          <Button mt={4} size='lg' width='full' onClick={handleBack} colorScheme='blue'>
            {translate('trade.doAnotherTrade')}
          </Button>
          <HStack width='full' justifyContent='space-between' mt={4}>
            <Button variant='link' onClick={onToggle} px={2}>
              {translate('trade.showDetails')}
            </Button>
            <TwirlyToggle isOpen={isOpen} onToggle={onToggle} />
          </HStack>
          <Box mx={-4}>
            <Collapse in={isOpen}>{children}</Collapse>
          </Box>
        </SlideTransition>
      </CardFooter>
    </>
  )
}
