import { Button } from '@chakra-ui/react'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import FoxyPromo from 'assets/foxy-promo.jpg'
import { Card } from 'components/Card/Card'
import { Carousel } from 'components/Carousel/Carousel'
import { RawText } from 'components/Text'
dayjs.extend(isBetween)

const promoData = [
  {
    title: 'Earn 3.15% APY on FOX',
    body: 'Your FOX is put to work across different DeFi protocols to earn the best yield possible.',
    cta: 'Deposit FOX Now',
    image: `url(${FoxyPromo})`,
    colorScheme: 'pink',
    startDate: '2022-11-28 8:00 AM',
    endDate: '2022-12-4 8:00 AM',
    id: 'foxy-promo',
    href: '?chainId=eip155%3A1&contractAddress=0xee77aa3Fd23BbeBaf94386dD44b548e9a785ea4b&assetReference=0xc770eefad204b5180df6a14ee197d99d808ee52d&rewardId=0xDc49108ce5C57bc3408c3A5E95F3d864eC386Ed3&provider=ShapeShift&modal=deposit',
  },
]

export const PromoCard = () => {
  const renderPromos = useMemo(() => {
    const filteredPromoCards = promoData.filter(e =>
      dayjs().isBetween(dayjs(e.startDate), dayjs(e.endDate)),
    )
    return filteredPromoCards.map(({ image, title, body, colorScheme = 'blue', href, cta, id }) => {
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
            <RawText fontWeight='bold'>{title}</RawText>
            <RawText fontSize='sm' mr={24}>
              {body}
            </RawText>
            <Button
              variant='outline'
              width='full'
              colorScheme={colorScheme}
              mt={2}
              as={NavLink}
              data-test={`${id}-button`}
              to={href}
            >
              {cta}
            </Button>
          </Card.Body>
        </Card>
      )
    })
  }, [])

  return (
    <Carousel autoPlay interval={10000} loop showArrows={false}>
      {renderPromos}
    </Carousel>
  )
}
