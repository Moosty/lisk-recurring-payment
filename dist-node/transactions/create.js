"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lisk_cryptography_1 = require("@liskhq/lisk-cryptography");
const lisk_validator_1 = require("@liskhq/lisk-validator");
const lisk_transactions_1 = require("@liskhq/lisk-transactions");
const constants_1 = require("../constants");
const schemas_1 = require("../schemas");
const utils_1 = require("../utils");
const lisk_chain_1 = require("@liskhq/lisk-chain");
const account_1 = require("@liskhq/lisk-chain/dist-node/account");
class CreateContract extends lisk_transactions_1.BaseTransaction {
    constructor(rawTransaction) {
        super(rawTransaction);
        const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
            ? rawTransaction
            : {});
        if (tx.asset) {
            this.asset = {
                ...tx.asset,
            };
        }
        else {
            this.asset = {};
        }
    }
    getContractPublicKey() {
        return utils_1.assetBytesToPublicKey(this.assetToBytes().toString());
    }
    getContractId() {
        return utils_1.getContractAddress(this.getContractPublicKey());
    }
    assetToBytes() {
        const unitAmount = lisk_cryptography_1.intToBuffer(this.asset.unit.amount.toString(), lisk_transactions_1.constants.BYTESIZES.AMOUNT, 'big');
        const typeBuffer = lisk_cryptography_1.intToBuffer(constants_1.TYPES.indexOf(this.asset.unit.type), 2);
        const timestampBuffer = lisk_cryptography_1.intToBuffer(this.asset.timestamp, 4);
        const typeAmountBuffer = lisk_cryptography_1.intToBuffer(this.asset.unit.typeAmount, 2);
        const prepaidBuffer = lisk_cryptography_1.intToBuffer(this.asset.unit.prepaid, 2);
        const totalBuffer = lisk_cryptography_1.intToBuffer(this.asset.unit.total, 2);
        const terminateFeeBuffer = lisk_cryptography_1.intToBuffer(this.asset.unit.terminateFee, 2);
        const titleBuffer = this.asset.title
            ? lisk_cryptography_1.stringToBuffer(this.asset.title)
            : Buffer.alloc(0);
        const recipientPublicKeyBuffer = this.asset.recipientPublicKey
            ? lisk_cryptography_1.stringToBuffer(this.asset.recipientPublicKey)
            : Buffer.alloc(0);
        const senderPublicKeyBuffer = this.asset.senderPublicKey
            ? lisk_cryptography_1.stringToBuffer(this.asset.senderPublicKey)
            : Buffer.alloc(0);
        const dataBuffer = this.asset.data
            ? lisk_cryptography_1.stringToBuffer(this.asset.data)
            : Buffer.alloc(0);
        return Buffer.concat([
            recipientPublicKeyBuffer,
            senderPublicKeyBuffer,
            titleBuffer,
            typeBuffer,
            typeAmountBuffer,
            unitAmount,
            prepaidBuffer,
            totalBuffer,
            terminateFeeBuffer,
            dataBuffer,
            timestampBuffer,
        ]);
    }
    async prepare(store) {
        await store.account.cache([
            {
                address: this.senderId,
            },
            {
                address: this.getContractId(),
            },
        ]);
    }
    assetToJSON() {
        return {
            ...this.asset,
            unit: {
                ...this.asset.unit,
                amount: this.asset.unit.amount.toString(),
            }
        };
    }
    validateAsset() {
        const asset = this.assetToJSON();
        const schemaErrors = lisk_validator_1.validator.validate(schemas_1.CreateContractAssetSchema, asset);
        const errors = lisk_transactions_1.convertToAssetError(this.id, schemaErrors);
        if (this.senderPublicKey !== this.asset.recipientPublicKey && this.senderPublicKey !== this.asset.senderPublicKey) {
            errors.push(new lisk_transactions_1.TransactionError('`.asset.recipientPublicKey` or `.asset.senderPublicKey` should be the same as `senderPublicKey`.', this.id, '.senderPublicKey', this.senderPublicKey, `${this.asset.recipientPublicKey} | ${this.asset.senderPublicKey}`));
        }
        if (this.asset.contractPublicKey && this.asset.contractPublicKey !== this.getContractPublicKey()) {
            errors.push(new lisk_transactions_1.TransactionError('`.asset.contractPublicKey` should be different.', this.id, '.asset.contractPublicKey', this.asset.contractPublicKey, this.getContractPublicKey()));
        }
        return errors;
    }
    async applyAsset(store) {
        const errors = [];
        const contract = await store.account.getOrDefault(this.getContractId());
        if (contract.balance > BigInt(0) || contract.publicKey !== this.asset.contractPublicKey || Object.keys(contract.asset).length > 0) {
            errors.push(new lisk_transactions_1.TransactionError('`contractPublicKey` already exists.', this.id, '.contractPublicKey', this.asset.contractPublicKey));
        }
        const updatedContract = {
            ...account_1.accountDefaultValues,
            address: this.getContractId(),
            publicKey: this.getContractPublicKey(),
            asset: {
                type: constants_1.PAYMENT_TYPE,
                rev: 0,
                state: this.asset.senderPublicKey === this.senderPublicKey ? constants_1.STATES.RECIPIENT_REVIEW : constants_1.STATES.SENDER_REVIEW,
                unit: {
                    ...this.asset.unit,
                },
                recipientPublicKey: this.asset.recipientPublicKey,
                senderPublicKey: this.asset.senderPublicKey,
                payments: 0,
                lastBalance: '0',
                start: 0,
                title: this.asset.title,
                initialTx: this.id,
            },
        };
        store.account.set(contract.address, new lisk_chain_1.Account(updatedContract));
        return errors;
    }
    async undoAsset(store) {
        const contract = await store.account.getOrDefault(this.getContractId());
        const updatedContract = {
            ...contract,
            asset: {},
        };
        store.account.set(updatedContract.address, new lisk_chain_1.Account(updatedContract));
        return [];
    }
}
exports.CreateContract = CreateContract;
CreateContract.TYPE = 13010;
//# sourceMappingURL=create.js.map