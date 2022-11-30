import { Button } from '@chakra-ui/react'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import isBetween from 'dayjs/plugin/isBetween'
import { useCallback, useMemo } from 'react'
import { useHistory } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { Carousel } from 'components/Carousel/Carousel'
import { RawText } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

dayjs.extend(isBetween)
dayjs.extend(customParseFormat)
const promoDateFormat = 'YYYY-MM-DD hh:mm A'

const promoData = [
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
]

export const PromoCard = () => {
  const {
    dispatch,
    state: { wallet, isDemoWallet },
  } = useWallet()
  const history = useHistory()

  const handleWalletModalOpen = useCallback(
    () => dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true }),
    [dispatch],
  )

  const handleClick = useCallback(
    ({ href, walletRequired }: { href: string; walletRequired: boolean }) => {
      if (walletRequired) {
        if (wallet && !isDemoWallet && supportsETH(wallet)) {
          history.push(href)
        } else {
          handleWalletModalOpen()
        }
      } else {
        history.push(href)
      }
    },
    [handleWalletModalOpen, history, isDemoWallet, wallet],
  )

  const renderPromos = useMemo(() => {
    const filteredPromoCards = promoData.filter(e =>
      dayjs().isBetween(dayjs(e.startDate, promoDateFormat), dayjs(e.endDate, promoDateFormat)),
    )
    return filteredPromoCards.map(
      ({ image, title, body, colorScheme = 'blue', href, cta, id, walletRequired }) => {
        return (
          <Card
            backgroundImage={image}
            backgroundSize='cover'
            backgroundPosition='center center'
            key={id}
          >
            <Card.Body
              display='flex'
              flexDir='column'
              gap={2}
              pb={filteredPromoCards.length > 1 ? 8 : 6}
            >
              <RawText fontWeight='bold' color={'whiteAlpha.900'}>
                {title}
              </RawText>
              <RawText fontSize='sm' mr={24} color={'whiteAlpha.900'}>
                {body}
              </RawText>
              <Button
                variant='outline'
                width='full'
                colorScheme={colorScheme}
                mt={2}
                onClick={() => handleClick({ href, walletRequired })}
                data-test={`${id}-button`}
              >
                {cta}
              </Button>
            </Card.Body>
          </Card>
        )
      },
    )
  }, [handleClick])
  return renderPromos.length ? (
    <Carousel autoPlay interval={10000} loop showArrows={false}>
      {renderPromos}
    </Carousel>
  ) : null
}
