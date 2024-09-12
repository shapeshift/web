import { Box, Button, Card, CardBody, Flex, Skeleton, Text } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type LpCardProps = {
  assetId: AssetId
  apy: string
  volume24H: string
  onClick: (assetId: AssetId) => void
  isLoading: boolean
}

const pairProps = { showFirst: true }

export const LpCard: React.FC<LpCardProps> = ({ assetId, apy, volume24H, isLoading, onClick }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const handleClick = useCallback(() => onClick(assetId), [assetId, onClick])

  if (!asset) return null

  return (
    <Skeleton isLoaded={!isLoading} onClick={handleClick}>
      <Card height='180px' width='100%' borderRadius='xl' p={0} as={Button} onClick={handleClick}>
        <CardBody
          as={Flex}
          flexDirection='column'
          justifyContent='space-between'
          p={4}
          width='100%'
          height='100%'
        >
          <Flex align='center' mb={4}>
            <AssetIcon assetId={asset.assetId} pairProps={pairProps} />
            <Box textAlign='left' ml={3}>
              <Text fontWeight='bold' fontSize='lg'>
                {asset.name}
              </Text>
              <Text fontSize='sm' color='gray.500'>
                {asset.symbol}
              </Text>
            </Box>
          </Flex>
          <Flex justify='space-between'>
            <Box textAlign='left'>
              <Amount.Percent
                autoColor
                value={bnOrZero(apy).times(0.01).toString()}
                fontWeight='medium'
              />
              <Text fontSize='sm' color='gray.500'>
                APY
              </Text>
            </Box>
            <Box textAlign='right'>
              {bnOrZero(volume24H).isPositive() ? (
                <Amount.Fiat
                  fontWeight='bold'
                  fontSize='xl'
                  value={bnOrZero(volume24H).isZero() ? 'N/A' : volume24H}
                />
              ) : (
                <Text fontSize='sm' color='gray.500'>
                  N/A
                </Text>
              )}
              <Text fontSize='sm' color='gray.500'>
                24h Volume
              </Text>
            </Box>
          </Flex>
        </CardBody>
      </Card>
    </Skeleton>
  )
}
