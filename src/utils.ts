import * as crypto from 'crypto';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';

export const assetBytesToPublicKey = (assetBytes: string): string => {
    const hash = crypto.createHash('sha256')
        .update(Buffer.from(assetBytes, 'utf8'))
        .digest();
    const pubKey = Buffer.concat([Buffer.alloc(4, "0230"), hash.slice(4, 32)]);
    return pubKey.toString("hex");
};

export const getContractAddress = (assetBytes: string): string => {
    return getAddressFromPublicKey(assetBytesToPublicKey(assetBytes));
};
