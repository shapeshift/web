import { Center, DarkMode, Flex, Link } from '@chakra-ui/react'
import { Main } from 'components/Layout/Main'
import { RawText, Text } from 'components/Text'

export const PrivacyPolicy = () => {
  return (
    <Main>
      <Flex px={{ base: 2, lg: 4 }} py={{ base: 4, lg: 8 }} direction={'column'} rowGap={4}>
        <DarkMode>
          <Center flexDirection={'column'}>
            <Text as='h3' translation={'connectWalletPage.shapeshift'} />
            <Text as='h1' translation={'common.privacy'} />
            <Text as='h3' translation={'common.legalDated'} mt={4} />
          </Center>
          <RawText as='p'>
            This notice summarizes our data collection, transfer, and protection practices
            associated with the decentralized ShapeShift platform (&quot;
            <RawText as='strong'>Platform</RawText>&quot;), and more generally outlines what we do
            with your data when you interact with the Platform in any way. Your use of the Platform
            constitutes your acceptance of all aspects of this notice, so read this notice
            carefully. All other aspects of your interaction with the Platform are governed by our{' '}
            <RawText as='strong'>Terms of Service</RawText>.
          </RawText>
          <RawText as='p'>
            <RawText as='strong'>How we can change this notice:</RawText> We may, in our sole
            discretion, modify this notice, so you should review this page periodically. When we
            change this notice, we will update the date at the top of this page. Prior versions of
            this notice can be found{' '}
            <Link href='#0'>
              <RawText as='strong'>here</RawText>.
            </Link>{' '}
            Your continued use of the Platform after any change to this notice constitutes your
            acceptance of such change. If you do not agree to any portion of this notice, then you
            should not use or access (or continue to access) the Platform.
          </RawText>
          <RawText as='p'>
            <RawText as='strong'>Privacy Generally:</RawText> We respect the privacy of the users of
            the Platform and we will not request any information beyond: what is necessary for your
            use of the Platform or to comply with our legal obligations. We also do not obscure any
            blockchain information requested or obtained through the Platform. You acknowledge that
            due to the inherent transparent nature of blockchains, transactions are public and
            easily correlated. Attempting to utilize the Platform to obscure a transaction or
            cryptocurrency will be pointless and ineffective, and is ill-advised. Law enforcement
            has full access to blockchain information that goes in or out of the Platform.
          </RawText>
          <RawText as='dl' display={'flex'} flexDirection={'column'} rowGap={4}>
            <RawText as='dt'>
              <RawText as='strong'>Data we collect:</RawText> Simply put, the Platform itself does
              not collect any of your personal information. All of your data is either retained
              locally by you or your wallet software or stored on the respective blockchain. Please
              note that the Platform is simply an interface to other third-party services or smart
              contracts, and these services or contracts may collect differently from us. Please
              check with the respective third-party or smart contract to see their data collection
              practices before connecting to or confirming a transaction on such service or
              contract. Technically, the Platform does not utilize cookie technology, rather we use
              a technology called IndexedDB, which may store data on your computer to enable a
              better experience on the Platform, but does not send any information back to us or the
              Platform. Lastly, when you interact with the Platform, you may be revealing your IP
              address to the site's host, however, we do not receive your IP address.
            </RawText>
          </RawText>
          <RawText as='p'>
            <RawText as='strong'>Data we share:</RawText> We use third-party service providers
            3Defi, LLC and Zendesk, Inc. (&quot;<RawText as='strong'>Zendesk</RawText>&quot;) to
            assist in our responses to queries made by users of the Platform and provide higher
            quality customer support to our users, which is necessary to perform agreement
            obligations (viz. our Terms of Service) for our users. Zendesk uses cookies as well as
            the inquiring user's name and email address in order to provide these services. No other
            information will be shared with Zendesk unless specifically provided by the user.
            Further information on data protection and your options in connection with Zendesk's
            services can be found{' '}
            <Link href='https://www.zendesk.com/company/customers-partners/privacy-policy/'>
              <RawText as='strong'>here</RawText>
            </Link>{' '}
            and Zendeks's cookie policy can be found{' '}
            <Link href='https://www.zendesk.com/company/customers-partners/cookie-policy/'>
              <RawText as='strong'>here</RawText>
            </Link>
            .
          </RawText>
          <RawText as='p'>
            <RawText as='strong'>How we store user data:</RawText> As we've mentioned in this
            notice, we limit the amount of user data in the first place. While we adhere to best
            practices when it comes to storing data, we limit the potential for a security breach
            that affects user data by not having user data in the first place.
          </RawText>
          <RawText as='p'>
            <RawText as='strong'>Who we are and how to contact us:</RawText> The Platform and this
            notice are maintained by the ShapeShift decentralized autonomous organization. The best
            way to get in touch with us is through our discord server, which you can join{' '}
            <Link href='https://discord.com/invite/shapeshift'>
              <RawText as='strong'>here</RawText>
            </Link>
            .
          </RawText>
        </DarkMode>
      </Flex>
    </Main>
  )
}
