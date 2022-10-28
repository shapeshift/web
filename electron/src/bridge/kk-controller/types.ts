import { KeepKeyHDWallet, TransportDelegate } from "@shapeshiftoss/hdwallet-keepkey"
import { Device } from "@shapeshiftoss/hdwallet-keepkey-nodewebusb"
import { Features } from "@keepkey/device-protocol/lib/messages_pb";

export type ControllerConfig = {
    FIRMWARE_BASE_URL?: string
}

export type GenericError = {
    prompt?: string
    success: boolean,
    error?: string
}

export type LatestFirmwareAndBootloaderData = {
    firmware: {
        version: string,
        url: string
    },
    bootloader: {
        version: string,
        url: string
    }
}

export type FirmwareAndBootloaderHashes = {
    bootloader: Array<{ [key: string]: string }>,
    firmware: Array<{ [key: string]: string }>
}

export type AllFirmwareAndBootloaderData = {
    latest: LatestFirmwareAndBootloaderData,
    hashes: FirmwareAndBootloaderHashes
}

export type WebusbWallet = DeviceFeatures & {
    wallet: KeepKeyHDWallet,
    device: Device,
    transport: TransportDelegate
}


export type BasicWallet = GenericError & DeviceFeatures;

export type DeviceFeatures = {
    bootloaderMode?: boolean,
    bootloaderVersion: string,
    firmwareVersion: string,
    features?: Features.AsObject,
}

