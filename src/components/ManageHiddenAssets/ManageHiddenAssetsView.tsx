import { ArrowBackIcon } from '@chakra-ui/icons'
import { Box, Flex, IconButton, Text } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { ManageHiddenAssetsList } from './ManageHiddenAssetsList'

export const ManageHiddenAssetsView = () => {
  const translate = useTranslate()
  const navigate = useNavigate()

  const handleBack = useCallback(() => {
    navigate('/')
  }, [navigate])

  const arrowBackIcon = useMemo(() => <ArrowBackIcon />, [])

  return (
    <Box height='100%' display='flex' flexDirection='column'>
      <Flex align='center' p={4} borderBottomWidth={1} borderColor='border.base'>
        <IconButton
          aria-label={translate('common.back')}
          icon={arrowBackIcon}
          variant='ghost'
          mr={3}
          onClick={handleBack}
        />
        <Text fontSize='lg' fontWeight='semibold'>
          {translate('manageHiddenAssets.title')}
        </Text>
      </Flex>
      <Box flex={1} overflow='auto' p={4}>
        <ManageHiddenAssetsList />
      </Box>
    </Box>
  )
}
