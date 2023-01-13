import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Flex } from '@chakra-ui/react'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import isBetween from 'dayjs/plugin/isBetween'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { Carousel } from 'components/Carousel/Carousel'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

import type { PromoItem } from './types'

dayjs.extend(isBetween)
dayjs.extend(customParseFormat)
const promoDateFormat = 'YYYY-MM-DD hh:mm A'

type PromoCardProps = {
  data: PromoItem[]
}

export const PromoCard: React.FC<PromoCardProps> = ({ data }) => {
  const {
    dispatch,
    state: { wallet, isDemoWallet },
  } = useWallet()
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
    }: {
      href: string
      walletRequired: boolean
      isExternal?: boolean
    }) => {
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
    [handleWalletModalOpen, history, isDemoWallet, wallet],
  )

  const renderPromos = useMemo(() => {
    const filteredPromoCards = data.filter(e =>
      dayjs().isBetween(dayjs(e.startDate, promoDateFormat), dayjs(e.endDate, promoDateFormat)),
    )
    return filteredPromoCards.map(
      ({
        rightElement,
        title,
        body,
        colorScheme = 'blue',
        href,
        cta,
        id,
        walletRequired,
        isExternal,
      }) => {
        return (
          <Card key={id}>
            <Card.Body display='flex' pb={filteredPromoCards.length > 1 ? 8 : 6} gap={6}>
              <Flex direction='column' alignItems='flex-start' gap={2}>
                <Text fontWeight='bold' color={'whiteAlpha.900'} translation={title} />
                <Text color={'gray.500'} translation={body} />
                <Button
                  variant='link'
                  colorScheme={colorScheme}
                  mt={4}
                  onClick={() => handleClick({ href, walletRequired, isExternal })}
                  rightIcon={<ArrowForwardIcon />}
                  data-test={`${id}-button`}
                >
                  {translate(cta)}
                </Button>
              </Flex>
              {rightElement && <Flex alignItems='center'>{rightElement}</Flex>}
            </Card.Body>
          </Card>
        )
      },
    )
  }, [data, handleClick, translate])
  return renderPromos.length ? <Carousel>{renderPromos}</Carousel> : null
}
