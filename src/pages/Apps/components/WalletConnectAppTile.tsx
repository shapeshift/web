import { ExternalLinkIcon } from "@chakra-ui/icons";
import { Button, Image, Link, Text as ChakraText } from "@chakra-ui/react";
import { Card } from "components/Card/Card";
import { Text } from "components/Text";
import { FC } from "react";
import { WalletConnectApp } from "./AppsList";

export const WalletConnectAppTile: FC<{ app: WalletConnectApp }> = ({ app }) => {
    return (
        <Card width='20%' padding='4' rounded='lg'>
            <ChakraText fontSize='lg' fontWeight='bold'>{app.name}</ChakraText>
            <Image
                mt={4}
                rounded='lg'
                src={app.image_url.lg}
            />
            <Button
                as={Link}
                mt={4}
                width='100%'
                leftIcon={<ExternalLinkIcon />}
                aria-label={"Open App"}
                isExternal
                href={app.homepage}
            >
                <Text translation={'apps.cta.open'} colorScheme='blue' />
            </Button>
        </Card >
    )
}