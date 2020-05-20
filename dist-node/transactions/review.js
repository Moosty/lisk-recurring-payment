"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const lisk_cryptography_1 = require("@liskhq/lisk-cryptography");
const lisk_validator_1 = require("@liskhq/lisk-validator");
const lisk_transactions_1 = require("@liskhq/lisk-transactions");
const lisk_chain_1 = require("@liskhq/lisk-chain");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const constants_1 = require("../constants");
const schemas_1 = require("../schemas");
const utils_1 = require("../utils");
class ReviewContract extends lisk_transactions_1.BaseTransaction {
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
    assetToBytes() {
        if (this.asset.accept) {
            const contractPublicKeyBuffer = lisk_cryptography_1.stringToBuffer(this.asset.contractPublicKey);
            const dataBuffer = this.asset.data
                ? lisk_cryptography_1.stringToBuffer(this.asset.data)
                : Buffer.alloc(0);
            return Buffer.concat([
                contractPublicKeyBuffer,
                dataBuffer,
            ]);
        }
        else {
            const contractPublicKeyBuffer = lisk_cryptography_1.stringToBuffer(this.asset.contractPublicKey);
            const unitAmount = this.asset.unit && this.asset.unit.amount
                ? lisk_cryptography_1.intToBuffer(this.asset.unit.amount.toString(), lisk_transactions_1.constants.BYTESIZES.AMOUNT, 'big')
                : Buffer.alloc(0);
            const typeBuffer = this.asset.unit && this.asset.unit.type
                ? lisk_cryptography_1.intToBuffer(constants_1.TYPES.indexOf(this.asset.unit.type), 2)
                : Buffer.alloc(0);
            const typeAmountBuffer = this.asset.unit && this.asset.unit.typeAmount
                ? lisk_cryptography_1.intToBuffer(this.asset.unit.typeAmount, 2)
                : Buffer.alloc(0);
            const prepaidBuffer = this.asset.unit && this.asset.unit.prepaid
                ? lisk_cryptography_1.intToBuffer(this.asset.unit.prepaid, 2)
                : Buffer.alloc(0);
            const totalBuffer = this.asset.unit && this.asset.unit.total
                ? lisk_cryptography_1.intToBuffer(this.asset.unit.total, 2)
                : Buffer.alloc(0);
            const terminateFeeBuffer = this.asset.unit && this.asset.unit.terminateFee
                ? lisk_cryptography_1.intToBuffer(this.asset.unit.terminateFee, 2)
                : Buffer.alloc(0);
            const dataBuffer = this.asset.data
                ? lisk_cryptography_1.stringToBuffer(this.asset.data)
                : Buffer.alloc(0);
            return Buffer.concat([
                contractPublicKeyBuffer,
                typeBuffer,
                typeAmountBuffer,
                unitAmount,
                prepaidBuffer,
                totalBuffer,
                terminateFeeBuffer,
                dataBuffer,
            ]);
        }
    }
    async prepare(store) {
        await store.account.cache([
            {
                address: this.senderId,
            },
            {
                address: utils_1.getContractAddress(this.asset.contractPublicKey),
            },
        ]);
    }
    assetToJSON() {
        return {
            ...this.asset,
        };
    }
    validateAsset() {
        const asset = this.assetToJSON();
        const schemaErrors = lisk_validator_1.validator.validate(schemas_1.ReviewContractAssetSchema, asset);
        const errors = lisk_transactions_1.convertToAssetError(this.id, schemaErrors);
        if (this.asset.accept && (this.asset.unit || this.asset.unitOld)) {
            errors.push(new lisk_transactions_1.TransactionError('When `.asset.accept === true`, `.asset.unit` and `.asset.unitOld` are not allowed.', this.id, '.asset.accept', `${this.asset.accept}`));
        }
        if (!this.asset.accept && !this.asset.unitOld) {
            errors.push(new lisk_transactions_1.TransactionError('Missing `.asset.unitOld`.', this.id, '.asset.unitOld'));
        }
        if (!this.asset.accept && !this.asset.unit) {
            errors.push(new lisk_transactions_1.TransactionError('Missing `.asset.unit`.', this.id, '.asset.unit'));
        }
        if (!this.asset.accept && this.asset.unitOld && this.asset.unit) {
            const unitKeys = Object.keys(this.asset.unit);
            const unitOldKeys = Object.keys(this.asset.unitOld);
            if (!lodash_1.default.isEqual(unitKeys, unitOldKeys)) {
                errors.push(new lisk_transactions_1.TransactionError('`.asset.unit` and `.asset.unitOld` should have the same keys.', this.id, '.asset.unit', JSON.stringify(unitKeys), JSON.stringify(unitOldKeys)));
            }
        }
        return errors;
    }
    async applyAsset(store) {
        const errors = [];
        const contract = await store.account.getOrDefault(utils_1.getContractAddress(this.asset.contractPublicKey));
        if (contract.asset.type !== constants_1.PAYMENT_TYPE) {
            errors.push(new lisk_transactions_1.TransactionError('`contractPublicKey` not a recurring payment contract.', this.id, '.asset.contractPublicKey', this.asset.contractPublicKey));
        }
        else {
            if (contract.asset.senderPublicKey !== this.senderPublicKey &&
                contract.asset.recipientPublicKey !== this.senderPublicKey) {
                errors.push(new lisk_transactions_1.TransactionError('Sender is not participant in contract', this.id, '.senderPublicKey', this.senderPublicKey, `${contract.asset.recipientPublicKey} | ${contract.asset.senderPublicKey}`));
            }
            if (contract.asset.state !== constants_1.STATES.SENDER_REVIEW && contract.asset.state !== constants_1.STATES.RECIPIENT_REVIEW) {
                errors.push(new lisk_transactions_1.TransactionError('Contract is not in review state.', this.id, '.asset.contractPublicKey', this.asset.contractPublicKey));
            }
            if ((contract.asset.state === constants_1.STATES.SENDER_REVIEW &&
                contract.asset.senderPublicKey !== this.senderPublicKey) ||
                (contract.asset.state === constants_1.STATES.RECIPIENT_REVIEW &&
                    contract.asset.recipientPublicKey !== this.senderPublicKey)) {
                errors.push(new lisk_transactions_1.TransactionError('The other party needs to review the contract', this.id, '.asset.contractPublicKey', this.asset.contractPublicKey));
            }
            if (this.asset.accept) {
                store.account.set(contract.address, new lisk_chain_1.Account({
                    ...contract,
                    asset: {
                        ...contract.asset,
                        state: constants_1.STATES.ACCEPTED,
                        start: store.chain.lastBlockHeader.timestamp
                    },
                }));
            }
            else if (!this.asset.accept) {
                if (contract.asset.type && contract.asset.type === constants_1.PAYMENT_TYPE) {
                    lodash_1.default.map(this.asset.unitOld, (value, key) => {
                        if (contract.asset.unit[key] !== value) {
                            errors.push(new lisk_transactions_1.TransactionError(`'.asset.unitOld.${key}' is not the right value`, this.id, `.asset.unitOld.${key}`, value, contract.asset.unit[key]));
                        }
                    });
                }
                const updatedContract = {
                    ...contract,
                    asset: {
                        ...contract.asset,
                        state: contract.asset.senderPublicKey === this.senderPublicKey ? constants_1.STATES.RECIPIENT_REVIEW : constants_1.STATES.SENDER_REVIEW,
                        rev: contract.asset.rev + 1,
                        unit: {
                            ...contract.asset.unit,
                            ...this.asset.unit,
                        },
                    },
                };
                store.account.set(contract.address, new lisk_chain_1.Account(updatedContract));
            }
        }
        return errors;
    }
    async undoAsset(store) {
        const contract = await store.account.getOrDefault(utils_1.getContractAddress(this.asset.contractPublicKey));
        if (this.asset.accept) {
            store.account.set(contract.address, new lisk_chain_1.Account({
                ...contract,
                asset: {
                    ...contract.asset,
                    state: contract.asset.senderPublicKey === this.senderPublicKey ? constants_1.STATES.SENDER_REVIEW : constants_1.STATES.RECIPIENT_REVIEW,
                },
            }));
        }
        else if (!this.asset.accept) {
            const updatedContract = {
                ...contract,
                asset: {
                    ...contract.asset,
                    rev: contract.asset.rev - 1,
                    state: contract.asset.senderPublicKey === this.senderPublicKey ? constants_1.STATES.SENDER_REVIEW : constants_1.STATES.RECIPIENT_REVIEW,
                    unit: {
                        ...contract.asset.unit,
                        ...this.asset.unitOld,
                    }
                },
            };
            store.account.set(updatedContract.address, new lisk_chain_1.Account(updatedContract));
        }
        return [];
    }
}
exports.ReviewContract = ReviewContract;
ReviewContract.TYPE = 13020;
//# sourceMappingURL=review.js.map