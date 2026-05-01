import { Box, Heading, Text } from '@chakra-ui/react'

interface SettingsCardProps {
  title: string
  description?: string
  headerRight?: React.ReactNode
  children: React.ReactNode
}

export const SettingsCard = ({
  title,
  description,
  headerRight,
  children,
}: SettingsCardProps): React.JSX.Element => (
  <Box
    bg='bg.surface'
    border='1px solid'
    borderColor='border.subtle'
    borderRadius='xl'
    p={{ base: 5, md: 6 }}
  >
    <Box display='flex' justifyContent='space-between' alignItems='center' gap={4} mb={4}>
      <Box>
        <Heading as='h3' fontSize='md' fontWeight={600} color='fg.bright' mb={description ? 2 : 0}>
          {title}
        </Heading>
        {description && (
          <Text fontSize='sm' color='fg.muted' lineHeight={1.5}>
            {description}
          </Text>
        )}
      </Box>
      {headerRight && <Box flexShrink={0}>{headerRight}</Box>}
    </Box>
    {children}
  </Box>
)
