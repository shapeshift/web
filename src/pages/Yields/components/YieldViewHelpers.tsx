import { ButtonGroup, Flex, IconButton, Text, Box } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { FaList, FaThLarge } from 'react-icons/fa'

export const ViewToggle = ({
    viewMode,
    setViewMode,
}: {
    viewMode: 'grid' | 'list'
    setViewMode: (mode: 'grid' | 'list') => void
}) => (
    <Flex justify='flex-end' mb={4}>
        <ButtonGroup size='sm' isAttached variant='outline'>
            <IconButton
                aria-label='Grid View'
                icon={<FaThLarge />}
                onClick={() => setViewMode('grid')}
                isActive={viewMode === 'grid'}
            />
            <IconButton
                aria-label='List View'
                icon={<FaList />}
                onClick={() => setViewMode('list')}
                isActive={viewMode === 'list'}
            />
        </ButtonGroup>
    </Flex>
)

export const ListHeader = () => {
    const translate = useTranslate()
    return (
        <Flex px={4} py={2} color='text.subtle' fontSize='xs' textTransform='uppercase' letterSpacing='wider'>
            <Box flex={2} minW='200px'>{translate('yieldXYZ.pool') ?? 'Pool'}</Box>
            <Box flex={1}>{translate('yieldXYZ.apy')}</Box>
            <Box flex={1} display={{ base: 'none', md: 'block' }}>{translate('yieldXYZ.tvl')}</Box>
            <Box flex={1} display={{ base: 'none', lg: 'block' }} textAlign='right'>{translate('yieldXYZ.type') ?? 'Type'}</Box>
        </Flex>
    )
}
