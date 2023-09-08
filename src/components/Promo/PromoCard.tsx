import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Card, CardBody, Flex, useColorModeValue } from '@chakra-ui/react'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import isBetween from 'dayjs/plugin/isBetween'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Carousel } from 'components/Carousel/Carousel'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'

import type { PromoItem } from './types'

dayjs.extend(isBetween)
dayjs.extend(customParseFormat)
const promoDateFormat = 'YYYY-MM-DD hh:mm A'

type PromoCardProps = {
  data: PromoItem[]
}

export const PromoCard: React.FC<PromoCardProps> = ({ data }) => {
  const textShadow = useColorModeValue(
    '--chakra-colors-blackAlpha-50',
    '--chakra-colors-blackAlpha-400',
  )
  const {
    dispatch,
    state: { wallet, isDemoWallet },
  } = useWallet()
  const mixpanel = getMixPanel()
  const history = useHistory()
  const translate = useTranslate()

  const handleWalletModalOpen = useCallback(
    () => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true }),
    [dispatch],
  )

  const handleClick = useCallback(
    ({
      href,
      walletRequired,
      isExternal,
      id,
    }: {
      href: string
      walletRequired: boolean
      isExternal?: boolean
      id: string
    }) => {
      mixpanel?.track('Promo Click', { id })
      if (walletRequired) {
        if (wallet && !isDemoWallet && supportsETH(wallet)) {
          isExternal ? window.open(href) : history.push(href)
        } else {
          handleWalletModalOpen()
        }
      } else {
        isExternal ? window.open(href) : history.push(href)
      }
    },
    [handleWalletModalOpen, history, isDemoWallet, mixpanel, wallet],
  )

  const renderPromos = useMemo(() => {
    const filteredPromoCards = data.filter(e =>
      dayjs().isBetween(dayjs(e.startDate, promoDateFormat), dayjs(e.endDate, promoDateFormat)),
    )
    return filteredPromoCards.map(
      ({
        rightElement,
        title,
        image,
        body,
        colorScheme = 'blue',
        href,
        cta,
        id,
        walletRequired,
        isExternal,
      }) => {
        return (
          <Card
            key={id}
            backgroundImage={image}
            backgroundSize='cover'
            backgroundRepeat='no-repeat'
            backgroundPosition='center -80px'
          >
            <CardBody display='flex' pb={filteredPromoCards.length > 1 ? 8 : 6} gap={6}>
              <Flex direction='column' alignItems='flex-start' gap={2}>
                <Text
                  letterSpacing='0.012em'
                  fontWeight='bold'
                  color={'whiteAlpha.900'}
                  translation={title}
                  textShadow={`0 2px 2px var(${textShadow})`}
                />
                <Text
                  translation={body}
                  textShadow={`0 2px 2px var(${textShadow})`}
                  letterSpacing='0.009em'
                />
                <Button
                  variant='link'
                  colorScheme={colorScheme}
                  mt={4}
                  onClick={() => handleClick({ href, walletRequired, isExternal, id })}
                  rightIcon={<ArrowForwardIcon />}
                  data-test={`${id}-button`}
                  letterSpacing='0.012em'
                >
                  {translate(cta)}
                </Button>
              </Flex>
              {rightElement && <Flex alignItems='center'>{rightElement}</Flex>}
            </CardBody>
          </Card>
        )
      },
    )
  }, [data, handleClick, textShadow, translate])
  return renderPromos.length ? <Carousel>{renderPromos}</Carousel> : null
}
