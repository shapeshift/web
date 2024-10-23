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
import { AssetIcon } from 'components/AssetIcon'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { selectLastHop } from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { TwirlyToggle } from '../TwirlyToggle'

export type TradeSuccessProps = {
  handleBack: () => void
  children: JSX.Element
  titleTranslation?: string
  descriptionTranslation?: string
}

const pairProps = { showFirst: true }

export const TradeSuccess = ({
  handleBack,
  titleTranslation,
  descriptionTranslation,
  children,
}: TradeSuccessProps) => {
  const translate = useTranslate()

  const { isOpen, onToggle: handleToggle } = useDisclosure({
    defaultIsOpen: false,
  })

  const lastHop = useAppSelector(selectLastHop)

  const subText = useMemo(() => {
    if (!lastHop) return ''

    const manager = getChainAdapterManager()
    const adapter = manager.get(lastHop.buyAsset.chainId)

    if (!adapter) return ''

    const chainName = adapter.getDisplayName()

    if (descriptionTranslation)
      return translate(descriptionTranslation, {
        symbol: lastHop.buyAsset.symbol,
        chainName,
      })

    return translate('trade.temp.tradeComplete', {
      symbol: lastHop.buyAsset.symbol,
      chainName,
    })
  }, [lastHop, translate, descriptionTranslation])

  if (!lastHop) return null

  return (
    <>
      <CardBody pb={0} px={0}>
        <SlideTransition>
          <Box textAlign='center' py={4}>
            <AssetIcon assetId={lastHop.buyAsset.assetId} mb={2} pairProps={pairProps} />
            <Text translation={titleTranslation ?? 'trade.temp.tradeSuccess'} />
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
            <Button variant='link' onClick={handleToggle} px={2}>
              {translate('trade.showDetails')}
            </Button>
            <TwirlyToggle isOpen={isOpen} onToggle={handleToggle} />
          </HStack>
          <Box mx={-4}>
            <Collapse in={isOpen}>{children}</Collapse>
          </Box>
        </SlideTransition>
      </CardFooter>
    </>
  )
}
