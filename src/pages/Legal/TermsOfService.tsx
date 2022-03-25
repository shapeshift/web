import { Center, DarkMode, Flex, Link } from '@chakra-ui/react'
import { Main } from 'components/Layout/Main'
import { RawText, Text } from 'components/Text'

export const TermsOfService = () => {
  return (
    <Main>
      <Flex px={{ base: 2, lg: 4 }} py={{ base: 4, lg: 8 }} direction={'column'} rowGap={4}>
        <DarkMode>
          <Center flexDirection={'column'}>
            <Text as='h3' translation={'connectWalletPage.shapeshift'} />
            <Text as='h1' translation={'common.terms'} />
            <Text as='h3' translation={'common.legalDated'} mt={4} />
          </Center>
          <RawText as='p'>WELCOME TO THE DECENTRALIZED SHAPESHIFT PLATFORM!</RawText>
          <RawText as='p'>
            THESE TERMS CONSTITUTE A LEGALLY BINDING AGREEMENT BETWEEN YOU AND THE SHAPESHIFT
            DECENTRALIZED AUTONOMOUS ORGANIZATION (WHO WE REFER TO IN THE FIRST PERSON IN THESE
            TERMS).{' '}
            <RawText as='strong'>
              WE ARE NOT AFFILIATED WITH SHAPESHIFT AG (OR ANY OF ITS AFFILIATES), THE PRIOR OWNER
              AND OPERATOR OF THE SHAPESHIFT PLATFORM.
            </RawText>{' '}
            PLEASE READ THIS DOCUMENT CAREFULLY TO ENSURE THAT YOU UNDERSTAND AND AGREE TO EVERY
            PORTION OF THESE TERMS BEFORE USING THE PLATFORM.
          </RawText>
          <RawText as='p'>
            <RawText as='strong'>What these terms are:</RawText> These terms govern your use of the
            decentralized ShapeShift cryptocurrency platform (&quot;
            <RawText as='strong'>Platform</RawText>&quot;), which we provide for free on an
            &quot;as-is&quot; basis as a public good, and with a full open source of the Platform's
            codebase—in exchange for your agreement to these terms. By either: (1) accessing or
            using the Platform; or (2) clicking a button or checking a box marked &quot;I
            Agree&quot; (or substantially similar language) on the Platform, you acknowledge that
            you have read, understood, acknowledge, and agree to: (i) these terms in full; and (ii)
            our <RawText as='strong'>privacy policy</RawText> (&quot;
            <RawText as='strong'>Privacy Policy</RawText>&quot;), which is incorporated into these
            terms and clarifies our data collection, privacy, storage, and transfer practices. Any
            conflicts between these terms and our Privacy Policy will be resolved in favor of the
            Privacy Policy.
          </RawText>
          <RawText as='p'>
            <RawText as='strong'>How we can change these terms:</RawText> We may, in our sole
            discretion, modify these terms at any time, so you should review this page periodically.
            When we change these terms, we will update the date at the top of this page. Prior
            versions of these terms can be found{' '}
            <Link href='#0'>
              <RawText as='strong'>here</RawText>
            </Link>
            . Your continued use of the Platform after any change to these terms constitutes your
            acceptance of such change. If you do not agree to any portion of these terms, then you
            should not use or access (or continue to access) the Platform.
          </RawText>
          <RawText as='p'>
            <RawText as='strong'>
              Quick disclaimer on buying, selling, transferring, or really doing anything in the
              cryptocurrency space:
            </RawText>{' '}
            We do not endorse or recommend any particular cryptocurrency, transaction, or purchasing
            strategy. Content on any of our websites or your communications with any member of our
            community should not be construed as advice. While the blockchains that you can access
            through our Platform are fully public, they are also fully immutable, meaning that once
            a transaction has been submitted it is unlikely to be reversible. Additionally, since
            blockchain transactions are highly technical, there are unfortunately many nefarious
            actors and scams still prevalent in the space. You should seek independent advice and
            conduct your own due diligence prior to using our Platform, or quite frankly, doing
            anything in the cryptocurrency space. Lastly, many cryptocurrencies remain highly
            volatile. All this is to say that: THE RISK OF LOSS IN BUYING OR SELLING ANY
            CRYPTOCURRENCY CAN BE SUBSTANTIAL, THEREFORE YOU SHOULD CAREFULLY CONSIDER WHETHER
            BUYING OR SELLING CRYPTOCURRENCY IS SUITABLE FOR YOU IN LIGHT OF YOUR FINANCIAL
            CONDITION BEFORE BUYING OR SELLING SUCH CRYPTOCURRENCY. Ok… thanks for bearing with us
            while we went through that.
          </RawText>
          <RawText as='h2'>THE PLATFORM</RawText>
          <RawText as='p'>
            <RawText as='strong'>Using the Platform:</RawText> In order to use our Platform, you
            must connect a compatible cryptocurrency wallet to it. Follow the prompts on the
            Platform to do so. Once you have connected a wallet to the Platform, all of the
            Platform's active services will be made available to you and we in turn then grant you a
            nonexclusive, fully revocable, limited license to use our Platform for lawful purposes.
            That said, this license does not include a license to use any intellectual property
            associated with the Platform, including the ShapeShift tradename or any associated
            logos.
          </RawText>
          <RawText as='dl' display={'flex'} flexDirection={'column'} rowGap={4}>
            <RawText as='dt'>
              The Platform only supports certain types of wallets, which are listed when you click
              &quot;Connect a Wallet&quot;, but we are constantly working to add more compatibility.
              For the latest updates on the addition of new features, such as the addition of new
              wallets, join our discord server{' '}
              <Link href='https://discord.com/invite/shapeshift'>
                <RawText as='strong'>here</RawText>
              </Link>
              ; there are various channels dedicated to our product roadmap. You can disconnect your
              wallet at any time by clicking the &quot;X Disconnect&quot; button or disconnecting
              through your wallet software. For more information on your wallet, check with your
              wallet software provider who has extensive documentation and tutorials on how to use
              their software.
            </RawText>
            <RawText as='dd' marginInlineStart={{ base: 2, lg: 4 }}>
              <RawText as='strong'>Important Note on wallets:</RawText> Our Platform is fully
              noncustodial meaning we never take access to your wallet, your secret seed phrase,
              your private keys, or any related passwords. While this enables you to have full
              control over your cryptocurrency, it unfortunately means that we can't assist you if
              you lose your seed phrase or access to your wallet. Thus prior to connecting to the
              service and periodically afterwards, we highly recommend that you WRITE DOWN your seed
              phrase (yes, physically write it down… don't screen shot it, copy it into a file, or
              type it out…ever! Go ahead and do this now. Don't worry…we'll wait. These terms will
              be right here when you get back). And you thought the disclaimer about the risks of
              cryptocurrency above was the only one. Sorry to disappoint! Lastly, use of a software
              wallet involves a level of inherent risk, and you should make your own informed
              decision as to which one is right for you.
            </RawText>
            <RawText as='dd' marginInlineStart={{ base: 2, lg: 4 }}>
              <RawText as='strong'>The ShapeShift Native Wallet:</RawText> Similar to the Platform,
              the ShapeShift native wallet (&quot;
              <RawText as='strong'>Native Wallet</RawText>&quot;) was originally designed and
              operated by ShapeShift AG and has since had its codebase open-sourced. The code can be
              reviewed{' '}
              <Link href='https://github.com/shapeshift/hdwallet'>
                <RawText as='strong'>here</RawText>
              </Link>
              . All references to the Platform in these terms also include the Native Wallet,
              meaning that the Native Wallet is provided for free, on an as-is basis, should be used
              at your own risk, and that the disclaimer of warranties below applies.
            </RawText>
            <RawText as='dt'>
              <RawText as='strong'>The Dashboard:</RawText> Through our Platform's dashboard
              function, you can view all compatible assets currently in your connected wallet and
              their respective estimated value in United States Dollars. We pull this pricing
              information from well-known public sources. Please note that unsupported assets,
              including non-fungible tokens (&quot;
              <RawText as='strong'>NFTs</RawText>&quot;) may not be viewable on the Platform's
              dashboard.
            </RawText>
            <RawText as='dd' marginInlineStart={{ base: 2, lg: 4 }}>
              <RawText as='strong'>
                Quick note on cryptocurrency pricing information on the Platform:
              </RawText>{' '}
              Because the Platform pulls pricing information from external, publicly available
              sources, we make no guarantees that this pricing information will actually materialize
              into such value as is listed on the Platform. YOU ARE RESPONSIBLE FOR CONFIRMING AN
              ACCEPTABLE PRICE FOR THE TRADING, BUYING, OR SELLING OF ANY CRYPTOCURRENCY.
            </RawText>
          </RawText>
          <RawText as='p'>
            <RawText as='strong'>Trading Cryptocurrency:</RawText> One of the core functions of the
            Platform is the trading of one type of cryptocurrency for another. The Platform itself
            does not conduct trades, nor are we ever a counterparty to trades on the Platform, but
            rather, the Platform acts as an interface for you to connect to third-party
            decentralized exchanges (&quot;
            <RawText as='strong'>DEX</RawText>&quot;) to complete a trade. We do not own or control
            any of the DEXs to which our Platform integrates. Prior to completing a trade on the
            Platform, we encourage you to research the DEX that will complete the trade.
          </RawText>
          <RawText as='dl' display={'flex'} flexDirection={'column'} rowGap={4}>
            <RawText as='dt'>
              To initiate a trade on the Platform, utilize the trade window to input the respective
              information and values. Once you input the required information, we will provide an
              exchange rate based on which DEX has the best available publicized rate through
              publicly available DEX aggregation tools. If you click the &quot;Preview Trade&quot;
              button, you'll see the full details of the trade before it is finalized, including the
              DEX that will be used to conduct the trade (which is shown beneath the exchange rate),
              the miner fee (see the note below for more information on miner fees), and any other
              transaction fees. If you do not wish to complete the trade, simply click the back
              arrow. Once you confirm a trade, unless the trade errors out, there is no reversing
              the trade. Because of the immutable nature of the blockchain, and since we are not
              counterparty to any of your trades, YOU ACKNOWLEDGE THAT WE ARE UNABLE TO ISSUE
              REFUNDS FOR ANY TRADES CONDUCTED ON THE PLATFORM. Once your trade completes, you will
              be able to view it on the respective blockchain explorer by clicking the applicable
              link on the confirmation screen.
            </RawText>
            <RawText as='dd' marginInlineStart={{ base: 2, lg: 4 }}>
              <RawText as='strong'>Quick Note on Miner Fees:</RawText> Most cryptocurrency
              transactions incur a miner fee, which is sometimes known as a gas fee or a network
              fee. This fee is paid to the miners who confirm the transaction on the blockchain.
              Miners are an instrumental component of the blockchain technology. We do not receive
              any portion of any miner fee incurred using our Platform and pull estimated miner fees
              directly from the applicable blockchain. We do not have the ability to waive any miner
              fees.
            </RawText>
          </RawText>
          <RawText as='p'>
            <RawText as='strong'>Sending and Receiving Cryptocurrency:</RawText> You may also send
            and receive cryptocurrency on the Platform. To do so, click on the &quot;Assets&quot;
            tab, and then the applicable asset that you wish to send or receive. Once on an asset's
            page, you'll see buttons for both send and receive functions. When inputting addresses
            to send or receive, we recommend only copying and pasting addresses (or utilizing the QR
            code) to minimize the possibility of errors or typos. We also highly encourage you to
            triple check any addresses before sending or receiving. Again, because the blockchain is
            immutable and we do not control it, we will not be liable for any errors you cause when
            sending and receiving.
          </RawText>
          <RawText as='dl' display={'flex'} flexDirection={'column'} rowGap={4}>
            <RawText as='dt'>
              <RawText as='strong'>Interactions with other smart contracts:</RawText> In addition to
              the above functions on the Platform, you may also interact with other types of
              third-party smart contracts for additional functionality of your cryptocurrency. Many
              of these additional functions are commonly referred to as decentralized finance or
              &quot;
              <RawText as='strong'>DeFi</RawText>&quot; and include functions such as earning yield
              on your cryptocurrency. As with trading on the Platform, these functions are entirely
              maintained by third-parties that are not affiliated with us, so again, please do your
              own due diligence before interacting with any DeFi functions on our Platform.
            </RawText>
            <RawText as='dd' marginInlineStart={{ base: 2, lg: 4 }}>
              <RawText as='strong'>Quick note on &quot;APR&quot;:</RawText> When you see &quot;
              <RawText as='strong'>APR</RawText>&quot; on the Platform, it means the estimated
              annual percentage for a particular smart contract function. The APR for a given smart
              contract function on our Platform is pulled from that smart contract's publicly
              available data. Accordingly, you acknowledge that we are not responsible for your
              reliance on any APR figures that you see on our Platform. For more information on how
              the underlying APR is calculated, please refer to the website or documentation of the
              third-party who maintains the applicable smart contract.
            </RawText>
          </RawText>

          <RawText as='p'>
            <RawText as='strong'>Support of the Platform:</RawText> We have no duty to support the
            Platform, but will try our best to do so. You can contact support by opening a support
            ticket{' '}
            <Link href='https://shapeshift.zendesk.com/hc/en-us/requests/new'>
              <RawText as='strong'>here</RawText>
            </Link>
            . Additionally, we have no duty to make any updates or bug fixes to the Platform.
          </RawText>
          <RawText as='p'>
            <RawText as='strong'>Promotions:</RawText> We may run various promotions or giveaways
            (each, a &quot;<RawText as='strong'>Promotion</RawText>&quot;) in connection with the
            Platform. These promotions will be communicated through official ShapeShift DAO
            communication mediums, including email, social media, and the ShapeShift DAO Discord
            server and all applicable details, including any qualification periods, entry procedures
            or requirements, award or selection criteria, and notification procedures will be
            contained therein. We are the sponsor for each Promotion, and Promotions are void where
            prohibited and open only to individuals who can lawfully participate in such Promotion
            in that individual's particular jurisdiction.
          </RawText>
          <RawText as='p'>
            <RawText as='strong'>FOX Tokens:</RawText> ShapeShift AG, with whom we are not
            affiliated, created a standard ERC-20 token on the Ethereum blockchain that can be
            accessed through most wallets that support Ethereum called the FOX token (each a &quot;
            <RawText as='strong'>FOX Token</RawText>&quot;). In spring 2021, ShapeShift AG
            airdropped the majority of its FOX Tokens to prior users, members of various DAOs,
            shareholders, employees, and to fund us as a DAO. FOX Tokens are used as governance
            tokens for the Platform. Neither we nor ShapeShift AG have ever sold FOX Tokens. To
            learn more about how FOX Token holders can participate in governance of the Platform,
            please join or discord server{' '}
            <Link href='https://discord.com/invite/shapeshift'>
              <RawText as='strong'>here</RawText>
            </Link>{' '}
            and see the channel titled &quot;governance&quot;. The smart contract for the FOX Tokens
            can be found{' '}
            <Link href='https://etherscan.io/token/0xc770eefad204b5180df6a14ee197d99d808ee52d'>
              <RawText as='strong'>here</RawText>
            </Link>
            .
          </RawText>
          <RawText as='h2'>LEGAL STUFF</RawText>
          <RawText as='p'>
            <RawText as='strong'>Disclaimer of Warranties:</RawText> As we pointed out, the Platform
            is being licensed to you for free, on an as-is basis, as a public good with a fully
            open-sourced codebase. In exchange for this, and because you can evaluate the Platform's
            codebase yourself (find it{' '}
            <Link href='https://github.com/shapeshift/web'>
              <RawText as='strong'>here</RawText>
            </Link>
            ,{' '}
            <Link href='https://github.com/shapeshift/lib'>
              <RawText as='strong'>here</RawText>
            </Link>
            , and{' '}
            <Link href='https://github.com/shapeshift/unchained'>
              <RawText as='strong'>here</RawText>
            </Link>
            ): YOU ACKNOWLEDGE THAT YOUR USE OF THE PLATFORM IS ON AN &quot;AS IS&quot; AND &quot;AS
            AVAILABLE&quot; BASIS, AND THAT WE MAKE NO GUARANTEES REGARDING THE PLATFORM. WE HEREBY
            EXPRESSLY DISCLAIM ALL IMPLIED AND STATUTORY WARRANTIES OF THE PLATFORM. YOU USE THE
            PLATFORM AT YOUR OWN RISK.
          </RawText>
          <RawText as='p'>
            <RawText as='strong'>Limitation of Liability:</RawText> We will not be liable to you for
            any damages, regardless of the kind of damages, arising due to your use of the Platform.
            In no event will: we, any one of our members, any contractor of ours, or any employee of
            ours, be liable to you for damages arising due to your use of the Platform in an amount
            exceeding the greater of: (1) US$100; or (2) the amount you actually paid to us in
            connection with the Platform. Because we make the Platform available without
            consideration and fully open-sourced, this section is a material term of these terms.
          </RawText>
          <RawText as='p'>
            <RawText as='strong'>Indemnification:</RawText> You acknowledge and agree that you will
            fully reimburse: us, any one of members, any contractor of ours, or any employee of
            ours, for any damages sought by any person related to your use of the Platform.
          </RawText>
          <RawText as='p'>
            <RawText as='strong'>Taxes:</RawText> Sometimes cryptocurrency transactions incur tax
            liability. While we will provide certain transaction information associated with any
            wallet you connect to the Platform, you should only rely on the information you can
            actually verify on the public blockchain and conduct your own independent cost or
            valuation analyses, ideally with your licensed tax professional. It is your sole
            responsibility to determine whether, and to what extent, any taxes apply to any
            transaction you conduct on the Platform. We will not withhold, collect, report, or remit
            any amount due to appropriate tax authorities on your behalf; as we said, the Platform
            is noncustodial, so even if we wanted to do this for you, we couldn't. You acknowledge
            that we will have no liability for any taxes associated with any of your transactions
            completed on the Platform and that we are encouraging you to consult with your own
            independent tax advisors to assess whether you have any tax liability in your respective
            jurisdiction(s).
          </RawText>
          <RawText as='p'>
            <RawText as='strong'>User feedback:</RawText> If you submit any feedback or suggestions
            to us, be it through the link on the Platform, our discord server, or otherwise, you are
            doing so gratuitously to us, and we may use such information as we see fit without any
            promise of compensation to you. Essentially, if you submit feedback or a suggestion to
            us, regardless of the means of submission, we own such information outright.
          </RawText>
          <RawText as='p'>
            <RawText as='strong'>How to contact us:</RawText> The best way to get in touch with us
            regarding the Platform is through our discord server, which you can join{' '}
            <Link href='https://discord.com/invite/shapeshift'>
              <RawText as='strong'>here</RawText>
            </Link>
            . There are a whole host of channels with specific uses, but the
            &quot;support-for-users&quot; channel might be your best first stop. PLEASE WATCH OUT
            FOR SCAMS! IF YOU JOIN OUR DISCORD SERVER, WE WILL NOT DM YOU DIRECTLY. YOU CAN REPORT
            SCAMS TO THE &quot;SPAM&quot; CHANNEL ON THE SERVER.
          </RawText>
        </DarkMode>
      </Flex>
    </Main>
  )
}
