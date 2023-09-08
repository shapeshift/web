import {
  Alert,
  Button,
  Flex,
  Image,
  List,
  ListIcon,
  ListItem,
  Stack,
  Tag,
  useColorModeValue,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { EmptyOverview } from 'features/defi/components/EmptyOverview/EmptyOverview'
import { useCallback, useMemo } from 'react'
import { MdCheckCircle } from 'react-icons/md'
import { useTranslate } from 'react-polyglot'
import BestYieldIcon from 'assets/best-yield.svg'
import IdleBg from 'assets/idle-bg.png'
import JuniorTrancheIcon from 'assets/junior-tranche.svg'
import SeniorTrancheIcon from 'assets/senior-tranche.svg'
import { AssetIcon } from 'components/AssetIcon'
import { Carousel } from 'components/Carousel/Carousel'
import { FiatRampAction } from 'components/Modals/FiatRamps/FiatRampsCommon'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectSupportsFiatRampByAssetId } from 'state/apis/fiatRamps/selectors'
import { IdleTag } from 'state/slices/opportunitiesSlice/resolvers/idle/constants'
import {
  selectAssetById,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type OnboardingStep = {
  title: string
  description?: string
  icon?: JSX.Element
  bullets?: string[]
}

const idleTagToOnboardingSteps: Record<IdleTag, OnboardingStep[]> = {
  [IdleTag.BestYield]: [
    {
      title: 'idle.emptyBody.seniorBestYield.page-1.title',
      description: 'idle.emptyBody.seniorBestYield.page-1.body',
      icon: <Image src={BestYieldIcon} />,
    },
    {
      title: 'idle.emptyBody.seniorBestYield.page-2.title',
      bullets: [
        'idle.emptyBody.seniorBestYield.page-2.bullets.one',
        'idle.emptyBody.seniorBestYield.page-2.bullets.two',
      ],
    },
  ],
  [IdleTag.JuniorTranche]: [
    {
      title: 'idle.emptyBody.juniorTranche.page-1.title',
      description: 'idle.emptyBody.juniorTranche.page-1.body',
      icon: <Image src={JuniorTrancheIcon} />,
    },
    {
      title: 'idle.emptyBody.juniorTranche.page-2.title',
      bullets: [
        'idle.emptyBody.leverageYield',
        'idle.emptyBody.higherRisk',
        'idle.emptyBody.noLockingPeriod',
        'idle.emptyBody.autoReinvest',
      ],
    },
  ],
  [IdleTag.SeniorTranche]: [
    {
      title: 'idle.emptyBody.seniorTranche.page-1.title',
      description: 'idle.emptyBody.seniorTranche.page-1.body',
      icon: <Image src={SeniorTrancheIcon} />,
    },
    {
      title: 'idle.emptyBody.seniorTranche.page-2.title',
      bullets: [
        'idle.emptyBody.minRisk',
        'idle.emptyBody.fundsCoveredJunior',
        'idle.emptyBody.noLockingPeriod',
        'idle.emptyBody.autoReinvest',
      ],
    },
  ],
}

type IdleEmptyProps = {
  assetId: AssetId
  onClick?: () => void
  tags?: IdleTag[]
  apy: string
}

export const IdleEmpty = ({ assetId, onClick, tags, apy }: IdleEmptyProps) => {
  const translate = useTranslate()
  const { open: openFiatRamp } = useModal('fiatRamps')
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const filter = useMemo(() => ({ assetId }), [assetId])
  const bgImage = useColorModeValue('none', IdleBg)
  const assetSupportsFiatRamp = useAppSelector(s => selectSupportsFiatRampByAssetId(s, filter))
  const cryptoBalance =
    useAppSelector(state => selectPortfolioCryptoPrecisionBalanceByFilter(state, filter)) ?? '0'
  const hasZeroCryptoBalance = bnOrZero(cryptoBalance).eq(0)
  const textShadow = useColorModeValue(
    '--chakra-colors-blackAlpha-50',
    '--chakra-colors-blackAlpha-400',
  )

  const handleAssetBuyClick = useCallback(() => {
    openFiatRamp({ assetId, fiatRampAction: FiatRampAction.Buy })
  }, [assetId, openFiatRamp])

  const renderFooter = useMemo(() => {
    return (
      <Flex flexDir='column' gap={4} width='full'>
        {hasZeroCryptoBalance && assetSupportsFiatRamp && (
          <Alert status='info' justifyContent='space-between' borderRadius='xl'>
            <Flex gap={2} alignItems='center'>
              <AssetIcon assetId={asset?.assetId} size='sm' />
              <Text
                fontWeight='bold'
                letterSpacing='-0.02em'
                translation={['common.needAsset', { asset: asset?.name }]}
              />
            </Flex>
            <Button variant='ghost' size='sm' colorScheme='blue' onClick={handleAssetBuyClick}>
              {translate('common.buyNow')}
            </Button>
          </Alert>
        )}
        <Button size='lg' width='full' colorScheme='blue' onClick={onClick}>
          <Text translation='common.continue' />
        </Button>
      </Flex>
    )
  }, [
    asset?.assetId,
    asset?.name,
    assetSupportsFiatRamp,
    hasZeroCryptoBalance,
    handleAssetBuyClick,
    onClick,
    translate,
  ])

  const renderTags = useMemo(() => {
    return tags?.map(tag => {
      if (idleTagToOnboardingSteps[tag]) {
        const tagDetails = idleTagToOnboardingSteps[tag]
        return (
          <Carousel key={tag} showDots options={{ loop: false, skipSnaps: false }}>
            {tagDetails.map((page, i) => (
              <Flex p={4} key={i} gap={4} width='full'>
                <Flex flexDir='column' textAlign='left' gap={2}>
                  {page.title && (
                    <Text
                      letterSpacing='0.012em'
                      fontSize='lg'
                      fontWeight='bold'
                      translation={page.title}
                      textShadow={`0 2px 2px var(${textShadow})`}
                    />
                  )}
                  {page.description && (
                    <Text
                      letterSpacing='0.02em'
                      textShadow={`0 2px 2px var(${textShadow})`}
                      translation={page.description}
                    />
                  )}

                  {page.bullets && (
                    <List spacing={3}>
                      {page.bullets.map(item => (
                        <ListItem key={item}>
                          <ListIcon color='green.500' as={MdCheckCircle} />
                          {translate(item)}
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Flex>
                {page.icon && <Flex flexBasis='150px'>{page.icon}</Flex>}
              </Flex>
            ))}
          </Carousel>
        )
      } else return <Tag key={tag}>{tag}</Tag>
    })
  }, [tags, textShadow, translate])

  if (!asset) return null

  return (
    <SlideTransition>
      <DefiModalContent
        backgroundImage={bgImage}
        backgroundSize='cover'
        backgroundPosition='center -120px'
        backgroundRepeat='no-repeat'
        overflow='hidden'
        borderRadius='2xl'
      >
        <EmptyOverview assets={[asset]} stackProps={{ pb: 0 }} footer={renderFooter}>
          <Stack spacing={4} justifyContent='center'>
            <Text
              fontWeight='bold'
              fontSize='xl'
              letterSpacing='0.012em'
              translation={[
                'idle.emptyTitle',
                { apy: bnOrZero(apy).times(100).toFixed(2), asset: asset?.symbol },
              ]}
              textShadow={`0 2px 2px var(${textShadow})`}
            />
            {renderTags}
          </Stack>
        </EmptyOverview>
      </DefiModalContent>
    </SlideTransition>
  )
}
