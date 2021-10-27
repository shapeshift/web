/* eslint-disable no-console */
import {
  Box,
  Button,
  Collapse,
  Flex,
  Heading,
  HStack,
  Image,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  Stat,
  StatArrow,
  StatGroup,
  StatLabel,
  StatNumber
} from '@chakra-ui/react'
import { BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import numeral from 'numeral'
import { Dispatch, SetStateAction, useState } from 'react'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { Graph } from 'components/Graph/Graph'
import { TimeControls } from 'components/Graph/TimeControls'
import { SanitizedHtml } from 'components/SanitizedHtml/SanitizedHtml'
import { RawText, Text } from 'components/Text'
import { AssetMarketData } from 'hooks/useAsset/useAsset'
import { usePercentChange } from 'pages/Assets/hooks/usePercentChange/usePercentChange'
import { usePriceHistory } from 'pages/Assets/hooks/usePriceHistory/usePriceHistory'

import { AssetActions } from './AssetActions'

export const AssetHeader = ({
  asset,
  isLoaded,
  currentScriptType,
  setCurrentScriptType
}: {
  asset: AssetMarketData
  isLoaded: boolean
  currentScriptType: BTCInputScriptType | undefined
  setCurrentScriptType: Dispatch<SetStateAction<BTCInputScriptType | undefined>>
}) => {
  const { name, symbol, description, icon, changePercent24Hr, price, marketCap, volume } = asset
  const percentChange = changePercent24Hr ?? 0
  const assetPrice = price ?? 0
  const [timeframe, setTimeframe] = useState(HistoryTimeframe.YEAR)
  const translate = useTranslate()
  const [showDescription, setShowDescription] = useState(false)
  const handleToggle = () => setShowDescription(!showDescription)
  const { data, loading } = usePriceHistory({
    asset,
    timeframe
  })
  const graphPercentChange = usePercentChange({ data, initPercentChange: percentChange })

  return (
    <Card variant='footer-stub'>
      <Card.Header display='flex' alignItems='center' flexDir={{ base: 'column', lg: 'row' }}>
        <Flex alignItems='center' mr='auto'>
          <SkeletonCircle boxSize='60px' isLoaded={isLoaded}>
            <Image src={icon} boxSize='60px' fallback={<SkeletonCircle boxSize='60px' />} />
          </SkeletonCircle>
          <Box ml={3} textAlign='left'>
            <Skeleton isLoaded={isLoaded}>
              <Heading fontSize='2xl' mb={1} lineHeight={1}>
                {name}
              </Heading>
            </Skeleton>
            <RawText fontSize='lg' color='gray.500' textTransform='uppercase' lineHeight={1}>
              <Skeleton isLoaded={isLoaded}>{symbol}</Skeleton>
            </RawText>
          </Box>
        </Flex>
        <AssetActions asset={asset} isLoaded={isLoaded} currentScriptType={currentScriptType} />
      </Card.Header>

      <Card.Body hidden={symbol !== 'BTC'}>
        <Button
          size='sm'
          colorScheme={currentScriptType === BTCInputScriptType.SpendWitness ? 'white' : 'blue'}
          variant='ghost'
          onClick={() => setCurrentScriptType(BTCInputScriptType.SpendWitness)}
        >
          <Text translation='assets.assetDetails.assetHeader.segwitNative' />
        </Button>
        <Button
          size='sm'
          colorScheme={currentScriptType === BTCInputScriptType.SpendP2SHWitness ? 'white' : 'blue'}
          variant='ghost'
          onClick={() => setCurrentScriptType(BTCInputScriptType.SpendP2SHWitness)}
        >
          <Text translation='assets.assetDetails.assetHeader.segwit' />
        </Button>
        <Button
          size='sm'
          colorScheme={currentScriptType === BTCInputScriptType.SpendAddress ? 'white' : 'blue'}
          variant='ghost'
          onClick={() => setCurrentScriptType(BTCInputScriptType.SpendAddress)}
        >
          <Text translation='assets.assetDetails.assetHeader.legacy' />
        </Button>
      </Card.Body>

      <Card.Body>
        <Box>
          <Flex justifyContent='space-between' width='full' flexDir={{ base: 'column', md: 'row' }}>
            <Skeleton isLoaded={isLoaded}>
              <HStack>
                <Button size='sm' colorScheme='blue' variant='ghost'>
                  <Text translation='assets.assetDetails.assetHeader.balance' />
                </Button>
                <Button size='sm' colorScheme='blue' variant='ghost' isActive={true}>
                  <Text translation='assets.assetDetails.assetHeader.price' />
                </Button>
              </HStack>
            </Skeleton>
            <Skeleton isLoaded={isLoaded}>
              <TimeControls onChange={setTimeframe} defaultTime={timeframe} />
            </Skeleton>
          </Flex>
          <Box width='full' alignItems='center' display='flex' flexDir='column' mt={6}>
            <Card.Heading fontSize='4xl' lineHeight={1} mb={2}>
              <Skeleton isLoaded={isLoaded}>
                <NumberFormat
                  value={assetPrice}
                  displayType={'text'}
                  thousandSeparator={true}
                  prefix={'$'}
                />
              </Skeleton>
            </Card.Heading>
            <StatGroup>
              <Stat size='sm' display='flex' flex='initial' mr={2}>
                <Skeleton isLoaded={isLoaded}>
                  <StatNumber
                    display='flex'
                    alignItems='center'
                    color={graphPercentChange > 0 ? 'green.500' : 'red.500'}
                  >
                    <StatArrow type={graphPercentChange > 0 ? 'increase' : 'decrease'} />
                    <RawText>{graphPercentChange.toFixed(2)}%</RawText>
                  </StatNumber>
                </Skeleton>
              </Stat>
              <Stat size='sm' color='gray.500'>
                <Skeleton isLoaded={isLoaded}>
                  <StatNumber>0.0005 BTC</StatNumber>
                </Skeleton>
              </Stat>
            </StatGroup>
          </Box>
        </Box>
      </Card.Body>
      <Card.Body px={0} py={0} position='relative' height='300px'>
        <Graph data={data} loading={loading} isLoaded={isLoaded} />
      </Card.Body>
      <Card.Footer>
        <HStack>
          <Stat textAlign='center'>
            <Skeleton isLoaded={isLoaded} variant='center' size='sm'>
              <StatLabel color='gray.500'>Price</StatLabel>
            </Skeleton>
            <StatNumber>
              <Skeleton isLoaded={isLoaded} variant='inline'>
                <NumberFormat
                  value={assetPrice}
                  displayType={'text'}
                  thousandSeparator={true}
                  prefix={'$'}
                />
              </Skeleton>
            </StatNumber>
          </Stat>
          <Stat textAlign='center'>
            <Skeleton isLoaded={isLoaded} variant='center' size='sm'>
              <StatLabel color='gray.500'>Market Cap</StatLabel>
            </Skeleton>
            <StatNumber>
              <Skeleton isLoaded={isLoaded} variant='inline'>
                {numeral(marketCap).format(`($0.00a)`)}
              </Skeleton>
            </StatNumber>
          </Stat>
          <Stat textAlign='center'>
            <Skeleton isLoaded={isLoaded} variant='center' size='sm'>
              <StatLabel color='gray.500'>24hr Volume</StatLabel>
            </Skeleton>
            <StatNumber>
              <Skeleton isLoaded={isLoaded} variant='inline'>
                {numeral(volume).format(`($0.00a)`)}
              </Skeleton>
            </StatNumber>
          </Stat>
          <Stat textAlign='center'>
            <StatLabel color='gray.500'>
              <Skeleton isLoaded={isLoaded} variant='center' size='sm'>
                Day Change
              </Skeleton>
            </StatLabel>
            <Skeleton isLoaded={isLoaded} variant='inline'>
              <StatNumber display='flex' alignItems='center' justifyContent='center'>
                <StatArrow type={percentChange > 0 ? 'increase' : 'decrease'} />
                <RawText>{percentChange.toFixed(2)}%</RawText>
              </StatNumber>
            </Skeleton>
          </Stat>
        </HStack>
      </Card.Footer>
      {description && (
        <Card.Footer>
          <Skeleton isLoaded={isLoaded} size='md'>
            <Card.Heading mb={4}>
              {translate('assets.assetDetails.assetHeader.aboutAsset', { asset: name })}
            </Card.Heading>
          </Skeleton>

          <Collapse startingHeight={70} in={showDescription}>
            <SkeletonText isLoaded={isLoaded} noOfLines={4} spacing={2} skeletonHeight='20px'>
              <SanitizedHtml color='gray.500' dirtyHtml={description} />
            </SkeletonText>
          </Collapse>
          <Button size='sm' onClick={handleToggle} mt='1rem'>
            {showDescription
              ? translate('assets.assetDetails.assetDescription.showLess')
              : translate('assets.assetDetails.assetDescription.showMore')}
          </Button>
        </Card.Footer>
      )}
    </Card>
  )
}
