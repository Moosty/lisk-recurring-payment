import * as crypto from 'crypto';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import {slotTypes} from "./constants";

export const assetBytesToPublicKey = (assetBytes: string): string => {
    const hash = crypto.createHash('sha256')
        .update(Buffer.from(assetBytes, 'utf8'))
        .digest();
    return hash.toString("hex");
};

export const getContractAddress = (assetBytes: string): string => {
    return getAddressFromPublicKey(assetBytesToPublicKey(assetBytes));
};

export const getNextSlot = (start, type, length, unit) => {
    const slot = slotTypes[type] * length;
    return start + (slot * (unit + 1));
}

export const getPastSlots = (start, now, type, length, unit) => {
    const slot = slotTypes[type] * length;
    return Math.floor((now - start) / slot) - unit;
}

// start : 1554630
// now :   1556630
// 60 * 1: 60
// unit : 0
// slot : 60

