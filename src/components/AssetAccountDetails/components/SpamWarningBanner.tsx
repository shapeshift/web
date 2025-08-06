import type { CardProps } from '@chakra-ui/react'
import { Box, Button, Card, CardBody, Divider, Flex, Icon } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { TbAlertTriangle } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { RawText } from '@/components/Text'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch } from '@/state/store'

type SpamWarningBannerProps = {
  assetId: AssetId
} & CardProps

export const SpamWarningBanner: React.FC<SpamWarningBannerProps> = ({ assetId, ...cardProps }) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()

  const handleToggleSpam = useCallback(() => {
    dispatch(preferences.actions.toggleSpamMarkedAssetId(assetId))
  }, [assetId, dispatch])

  return (
    <Card
      color='black'
      bg='yellow.500'
      border='1px solid'
      rounded='lg'
      borderColor='yellow.600'
      {...cardProps}
    >
      <CardBody padding={0}>
        <Box>
          <Flex alignItems='center' gap={2} p={2}>
            <Icon as={TbAlertTriangle} fontSize='2xl' />
            <RawText fontWeight='medium' fontSize='sm'>
              {translate('assets.spam.warning')}
            </RawText>
          </Flex>
          <Divider borderColor='blackAlpha.300' />
          <Button
            size='md'
            fontSize='sm'
            width='full'
            borderRadius='lg'
            colorScheme='black'
            color='black'
            onClick={handleToggleSpam}
          >
            {translate('assets.spam.reportAsNotSpam')}
          </Button>
        </Box>
      </CardBody>
    </Card>
  )
}
