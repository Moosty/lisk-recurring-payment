import * as crypto from 'crypto';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';

export const assetBytesToPublicKey = (assetBytes: string): string => {
    const hash = crypto.createHash('sha256')
        .update(Buffer.from(assetBytes, 'utf8'))
        .digest();
    return hash.toString("hex");
};

export const getContractAddress = (assetBytes: string): string => {
    return getAddressFromPublicKey(assetBytesToPublicKey(assetBytes));
};
