import { AvatarProps } from '@chakra-ui/avatar'
import { useColorModeValue } from '@chakra-ui/color-mode'
import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, BoxProps, Center, Circle, Divider, Flex } from '@chakra-ui/layout'
import { Asset } from '@shapeshiftoss/types'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'

type AssetWithAmounts = {
  cryptoAmount: string
  fiatAmount: string
} & Asset

export type AssetToAssetProps = {
  assets: [AssetWithAmounts, AssetWithAmounts]
  statusIcon?: React.ReactNode
  loading?: boolean
} & Pick<AvatarProps, 'boxSize'> &
  Pick<BoxProps, 'bg'>

export const AssetToAsset = ({
  assets,
  boxSize = '32px',
  statusIcon = <ArrowForwardIcon />,
  bg,
  loading
}: AssetToAssetProps) => {
  const defaultBg = useColorModeValue('white', 'gray.750')
  const [fromAsset, toAsset] = assets
  return (
    <Flex width='full' justifyContent='space-between'>
      <Box flex={1}>
        <Flex alignItems='center'>
          <AssetIcon src={fromAsset.icon} boxSize={boxSize} />
          <Divider flex={1} bgColor={fromAsset.color} borderBottomWidth={2} />
        </Flex>
        <Box mt={2}>
          <Amount.Fiat fontWeight='bold' value={fromAsset.fiatAmount} />
          <Amount.Crypto
            color='gray.500'
            value={fromAsset.cryptoAmount}
            symbol={fromAsset.symbol}
          />
        </Box>
      </Box>
      <Flex>
        <Circle
          size={boxSize}
          bg='blue.500'
          p='2px'
          background={`linear-gradient(to right, ${fromAsset.color}, ${toAsset.color})`}
        >
          <Circle bg={bg ? bg : defaultBg} w='100%' h='100%'>
            <Center position='absolute'>{statusIcon}</Center>
            <CircularProgress
              color='blue.500'
              thickness='6px'
              isIndeterminate={loading}
              trackColor='transparent'
            />
          </Circle>
        </Circle>
      </Flex>
      <Flex flexDir='column' flex={1}>
        <Flex alignItems='center' flex={1} justify='flex-start'>
          <Divider flex={1} bgColor={toAsset.color} borderBottomWidth={2} />
          <AssetIcon src={toAsset.icon} boxSize={boxSize} />
        </Flex>
        <Box textAlign='right' mt={2}>
          <Amount.Fiat fontWeight='bold' value={toAsset.fiatAmount} />
          <Amount.Crypto color='gray.500' value={toAsset.cryptoAmount} symbol={toAsset.symbol} />
        </Box>
      </Flex>
    </Flex>
  )
}
