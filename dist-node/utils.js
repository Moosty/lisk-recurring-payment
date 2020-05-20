"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const crypto = tslib_1.__importStar(require("crypto"));
const lisk_cryptography_1 = require("@liskhq/lisk-cryptography");
const constants_1 = require("./constants");
exports.assetBytesToPublicKey = (assetBytes) => {
    const hash = crypto.createHash('sha256')
        .update(Buffer.from(assetBytes, 'utf8'))
        .digest();
    return hash.toString("hex");
};
exports.getContractAddress = (assetBytes) => {
    return lisk_cryptography_1.getAddressFromPublicKey(exports.assetBytesToPublicKey(assetBytes));
};
exports.getNextSlot = (start, type, length, unit) => {
    const slot = constants_1.slotTypes[type] * length;
    return start + (slot * (unit + 1));
};
exports.getPastSlots = (start, now, type, length, unit) => {
    const slot = constants_1.slotTypes[type] * length;
    return Math.floor((now - start) / slot) - unit;
};
//# sourceMappingURL=utils.js.map