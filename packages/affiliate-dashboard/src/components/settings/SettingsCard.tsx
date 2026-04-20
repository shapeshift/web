import { Box, Heading, Text } from '@chakra-ui/react'

interface SettingsCardProps {
  title: string
  description?: string
  children: React.ReactNode
}

export const SettingsCard = ({
  title,
  description,
  children,
}: SettingsCardProps): React.JSX.Element => (
  <Box
    bg='bg.surface'
    border='1px solid'
    borderColor='border.subtle'
    borderRadius='xl'
    p={{ base: 5, md: 6 }}
  >
    <Heading as='h3' fontSize='md' fontWeight={600} color='fg.bright' mb={description ? 2 : 4}>
      {title}
    </Heading>
    {description && (
      <Text fontSize='sm' color='fg.muted' mb={4} lineHeight={1.5}>
        {description}
      </Text>
    )}
    {children}
  </Box>
)
