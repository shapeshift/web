import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Flex, Image } from '@chakra-ui/react'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import isBetween from 'dayjs/plugin/isBetween'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import OnRamperLogo from 'assets/on-ramper.png'
import { Card } from 'components/Card/Card'
import { Carousel } from 'components/Carousel/Carousel'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

dayjs.extend(isBetween)
dayjs.extend(customParseFormat)
const promoDateFormat = 'YYYY-MM-DD hh:mm A'

type PromoItem = {
  id: string
  title: string
  body: string
  cta: string
  href: string
  startDate: string
  endDate: string
  image?: string
  colorScheme?: string
  walletRequired: boolean
  rightElement?: JSX.Element
  isExternal?: boolean
}

const promoData: PromoItem[] = [
  {
    title: 'Earn 3.15% APY on FOX',
    body: 'Your FOX is put to work across different DeFi protocols to earn the best yield possible.',
    cta: 'Deposit FOX Now',
    image: `url(https://uploads-ssl.webflow.com/5cec55545d0f47cfe2a39a8e/637d3eab8977b9c820ecb3fc_foxy-promo-1.jpg)`,
    colorScheme: 'pink',
    startDate: '2022-11-28 08:00 AM',
    endDate: '2022-12-04 08:00 AM',
    id: 'foxy-promo',
    walletRequired: true,
    href: '?chainId=eip155%3A1&contractAddress=0xee77aa3Fd23BbeBaf94386dD44b548e9a785ea4b&assetReference=0xc770eefad204b5180df6a14ee197d99d808ee52d&rewardId=0xDc49108ce5C57bc3408c3A5E95F3d864eC386Ed3&provider=ShapeShift&modal=deposit',
  },
  {
    title: 'promo.onRamper.title',
    body: 'promo.onRamper.body',
    cta: 'promo.onRamper.cta',
    image: `url(https://uploads-ssl.webflow.com/5cec55545d0f47cfe2a39a8e/637d3eab8977b9c820ecb3fc_foxy-promo-1.jpg)`,
    startDate: '2023-01-01 08:00 AM',
    endDate: '2023-02-01 08:00 AM',
    id: 'apple-pay',
    href: 'https://widget.onramper.com/?apiKey=pk_prod_ViOib9FcqKQeqqBsLF6ZPYis8X0Wdl9ma16rBhTxXmw0&defaultCrypto=ETH&supportSell=false&isAddressEditable=false&language=en&darkMode=true&redirectURL=https%3A%2F%2Fapp.shapeshift.com%2F%23%2Fbuy-crypto&onlyGateways=Mercuryo',
    walletRequired: false,
    rightElement: <Image width='80px' overflow='hidden' borderRadius='lg' src={OnRamperLogo} />,
    isExternal: true,
  },
]

export const PromoCard = () => {
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
    const filteredPromoCards = promoData.filter(e =>
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
  }, [handleClick, translate])
  return renderPromos.length ? <Carousel>{renderPromos}</Carousel> : null
}
