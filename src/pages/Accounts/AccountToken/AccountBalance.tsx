import { ArrowBackIcon } from '@chakra-ui/icons'
import type { ResponsiveValue } from '@chakra-ui/react'
import { Button, Card, CardBody, CardFooter, CardHeader, Flex, Tooltip } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { Property } from 'csstype'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { AssetActions } from '@/components/AssetHeader/AssetActions'
import { AssetIcon } from '@/components/AssetIcon'
import { AssetName } from '@/components/AssetName/AssetName'
import { RawText } from '@/components/Text'
import {
  selectAssetById,
  selectCryptoHumanBalanceFilter,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectUserCurrencyBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type AccountBalanceProps = {
  assetId: AssetId
  accountId: AccountId
}

const arrowBackIcon = <ArrowBackIcon />
const flexDirMdRow: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }

const backButtonDisplay = { base: 'none', md: 'flex' }

const justifyContent = { base: 'center', md: 'space-between' }

const bodyAlign = { base: 'center', md: 'flex-start' }

export const AccountBalance: React.FC<AccountBalanceProps> = ({ assetId, accountId }) => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const assetAccountFilter = useMemo(() => ({ assetId, accountId }), [assetId, accountId])
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))
  // Add back in once we add the performance stuff in
  // const footerBg = useColorModeValue('white.100', 'rgba(255,255,255,.02)')

  const cryptoBalance =
    useAppSelector(state =>
      selectPortfolioCryptoPrecisionBalanceByFilter(state, assetAccountFilter),
    ) ?? '0'

  const userCurrencyBalance = useAppSelector(s =>
    selectUserCurrencyBalanceByFilter(s, assetAccountFilter),
  )
  const cryptoHumanBalance = useAppSelector(s =>
    selectCryptoHumanBalanceFilter(s, assetAccountFilter),
  )
  const handleClick = useCallback(() => navigate(-1), [navigate])
  const balanceContent = useMemo(() => {
    if (!marketData)
      return (
        <Tooltip label={translate('common.marketDataUnavailable', { asset: asset?.name })}>
          <RawText fontSize='4xl' lineHeight={1}>
            N/A
          </RawText>
        </Tooltip>
      )
    return <Amount.Fiat fontSize='4xl' value={userCurrencyBalance} lineHeight={1} />
  }, [marketData, userCurrencyBalance, asset?.name, translate])

  if (!asset) return null
  return (
    <Card overflow='hidden'>
      <CardHeader display='flex' justifyContent={justifyContent} alignItems='center'>
        <Button
          size='sm'
          leftIcon={arrowBackIcon}
          onClick={handleClick}
          display={backButtonDisplay}
        >
          {translate('common.back')}
        </Button>
        <Flex alignItems='center' gap={2}>
          <AssetIcon assetId={asset.assetId} height='30px' width='auto' />
          <AssetName fontWeight='bold' assetId={asset.assetId} />
        </Flex>
      </CardHeader>
      <CardBody
        gap={4}
        fontWeight='bold'
        display='flex'
        flexDir={flexDirMdRow}
        alignItems={bodyAlign}
      >
        <Flex flexDir='column'>
          {balanceContent}
          <Amount.Crypto
            color='text.subtle'
            fontWeight='normal'
            value={cryptoHumanBalance}
            symbol={asset.symbol}
            lineHeight='shorter'
          />
        </Flex>
      </CardBody>
      <CardFooter>
        <AssetActions
          assetId={assetId}
          accountId={accountId}
          cryptoBalance={cryptoBalance}
          isMobile
        />
      </CardFooter>
      {/* 
      @TODO: Hide for now until we have the data to hook this up
      <CardFooter
        bg={footerBg}
        display='flex'
        alignItems='flex-start'
        justifyContent='space-between'
        gap={4}
      >
        <Heading lineHeight='shorter' flex={1}>
          Performance
        </Heading>
        <StatGroup gap={8} flex={1}>
          <Stat>
            <StatLabel lineHeight='shorter'>24hr return</StatLabel>
            <StatNumber>
              <Amount.Percent value='0.2' autoColor />
            </StatNumber>
          </Stat>
          <Stat>
            <StatLabel lineHeight='shorter'>24hr return</StatLabel>
            <StatNumber>
              <Amount.Percent value='0.2' autoColor />
            </StatNumber>
          </Stat>
          <Stat>
            <StatLabel lineHeight='shorter'>24hr return</StatLabel>
            <StatNumber>
              <Amount.Percent value='0.2' autoColor />
            </StatNumber>
          </Stat>
        </StatGroup>
      </CardFooter> */}
    </Card>
  )
}
