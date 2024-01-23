import {
  Button,
  CardBody,
  CardFooter,
  Center,
  CircularProgress,
  Flex,
  Heading,
  HStack,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { PropsWithChildren } from 'react'
import { useMemo } from 'react'
import { FaCheck } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { rune } from 'test/mocks/assets'
import { Amount } from 'components/Amount/Amount'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { AsymSide, type ConfirmedQuote } from 'lib/utils/thorchain/lp/types'
import type { ParsedPool } from 'pages/ThorChainLP/queries/hooks/usePools'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type ReusableLpStatusProps = {
  handleBack: () => void
  pool?: ParsedPool
  baseAssetId: AssetId
  isComplete?: boolean
  confirmedQuote: ConfirmedQuote
} & PropsWithChildren

export const ReusableLpStatus: React.FC<ReusableLpStatusProps> = ({
  pool,
  baseAssetId,
  isComplete,
  confirmedQuote,
  handleBack,
  children,
}) => {
  const translate = useTranslate()

  const asset = useAppSelector(state => selectAssetById(state, pool?.assetId ?? ''))
  const baseAsset = useAppSelector(state => selectAssetById(state, baseAssetId))

  const assets: Asset[] = useMemo(() => {
    if (!(pool && asset && baseAsset)) return []

    if (pool.asymSide === null) return [asset, baseAsset]
    if (pool.asymSide === AsymSide.Rune) return [baseAsset]
    if (pool.asymSide === AsymSide.Asset) return [asset]

    throw new Error('Invalid asym side')
  }, [asset, baseAsset, pool])

  const hStackDivider = useMemo(() => {
    if (pool?.asymSide) return <></>

    return <RawText mx={1}>{translate('common.and')}</RawText>
  }, [pool?.asymSide, translate])

  const renderBody = useMemo(() => {
    if (!(pool && asset && rune)) return null

    if (isComplete) {
      return (
        <CardBody display='flex' flexDir='column' alignItems='center' justifyContent='center'>
          <Center
            bg='background.success'
            boxSize='80px'
            borderRadius='full'
            color='text.success'
            fontSize='xl'
            my={8}
          >
            <FaCheck />
          </Center>
          <Heading as='h4'>{translate('pools.transactionSubmitted')}</Heading>
        </CardBody>
      )
    }

    const supplyAssets = assets.map(_asset => {
      const amountCryptoPrecision =
        _asset.assetId === thorchainAssetId
          ? confirmedQuote.runeCryptoLiquidityAmount
          : confirmedQuote.assetCryptoLiquidityAmount
      return (
        <Amount.Crypto
          key={`amount-${asset.assetId}`}
          value={amountCryptoPrecision}
          symbol={_asset.symbol}
        />
      )
    })

    return (
      <CardBody textAlign='center'>
        <Center my={8}>
          <CircularProgress
            size='100px'
            thickness={4}
            isIndeterminate
            trackColor='background.surface.raised.base'
          />
        </Center>
        <Heading as='h4'>{translate('pools.waitingForConfirmation')}</Heading>
        <Flex gap={1} justifyContent='center' fontWeight='medium'>
          <RawText>{translate('pools.supplying')}</RawText>
          <HStack divider={hStackDivider}>{supplyAssets}</HStack>
        </Flex>
      </CardBody>
    )
  }, [asset, assets, confirmedQuote, pool, hStackDivider, isComplete, translate])

  return (
    <SlideTransition>
      {renderBody}
      {children && (
        <CardFooter flexDir='column' px={4}>
          {children}
        </CardFooter>
      )}
      {isComplete && (
        <CardFooter flexDir='column'>
          <Button size='lg' mx={-2} onClick={handleBack}>
            {translate('common.goBack')}
          </Button>
        </CardFooter>
      )}
    </SlideTransition>
  )
}
