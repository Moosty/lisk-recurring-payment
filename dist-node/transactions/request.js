"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lisk_cryptography_1 = require("@liskhq/lisk-cryptography");
const lisk_validator_1 = require("@liskhq/lisk-validator");
const lisk_transactions_1 = require("@liskhq/lisk-transactions");
const lisk_chain_1 = require("@liskhq/lisk-chain");
const constants_1 = require("../constants");
const schemas_1 = require("../schemas");
const utils_1 = require("../utils");
class RequestPayment extends lisk_transactions_1.BaseTransaction {
    constructor(rawTransaction) {
        super(rawTransaction);
        this.asset = {};
        const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
            ? rawTransaction
            : {});
        if (tx.asset) {
            this.asset = {
                ...tx.asset,
            };
        }
    }
    assetToBytes() {
        const unitBuffer = lisk_cryptography_1.intToBuffer(this.asset.unit, 2);
        const contractPublicKeyBuffer = this.asset.contractPublicKey
            ? lisk_cryptography_1.stringToBuffer(this.asset.contractPublicKey)
            : Buffer.alloc(0);
        const dataBuffer = this.asset.data
            ? lisk_cryptography_1.stringToBuffer(this.asset.data)
            : Buffer.alloc(0);
        return Buffer.concat([
            contractPublicKeyBuffer,
            unitBuffer,
            dataBuffer,
        ]);
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
        const schemaErrors = lisk_validator_1.validator.validate(schemas_1.RequestPaymentAssetSchema, asset);
        return lisk_transactions_1.convertToAssetError(this.id, schemaErrors);
    }
    async applyAsset(store) {
        const errors = [];
        const sender = await store.account.getOrDefault(this.senderId);
        const contract = await store.account.getOrDefault(utils_1.getContractAddress(this.asset.contractPublicKey));
        if (contract.asset.type !== constants_1.PAYMENT_TYPE) {
            errors.push(new lisk_transactions_1.TransactionError('`contractPublicKey` not a recurring payment contract.', this.id, '.asset.contractPublicKey', this.asset.contractPublicKey));
        }
        else {
            if (contract.asset.recipientPublicKey !== this.senderPublicKey) {
                errors.push(new lisk_transactions_1.TransactionError('Sender is not recipient in this contract', this.id, '.senderPublicKey', this.senderPublicKey, contract.asset.recipientPublicKey));
            }
            if (contract.asset.state !== constants_1.STATES.ACTIVE) {
                errors.push(new lisk_transactions_1.TransactionError('Recurring payment contract is not active', this.id, '.state', contract.asset.state, constants_1.STATES.ACTIVE));
            }
            if (contract.asset.payments + 1 !== this.asset.unit) {
                errors.push(new lisk_transactions_1.TransactionError('Wrong `.asset.unit` number given', this.id, '.asset.unit', this.asset.unit, contract.asset.payments + 1));
            }
            const nextSlot = utils_1.getNextSlot(contract.asset.start, contract.asset.unit.type, contract.asset.unit.typeAmount, contract.asset.payments);
            if (nextSlot > store.chain.lastBlockHeader.timestamp) {
                errors.push(new lisk_transactions_1.TransactionError('No unlocked tokens available', this.id, '.timestamp', store.chain.lastBlockHeader.timestamp, `>= ${nextSlot}`));
            }
            if (contract.balance < BigInt(contract.asset.unit.amount)) {
                errors.push(new lisk_transactions_1.TransactionError('Contract balance is too low', this.id, '.balance', contract.balance.toString(), `> ${contract.asset.unit.amount}`));
            }
            const unitsAvailable = utils_1.getPastSlots(contract.asset.start, store.chain.lastBlockHeader.timestamp, contract.asset.unit.type, contract.asset.unit.typeAmount, contract.asset.payments);
            let payments = 0;
            if (contract.balance <= BigInt(BigInt(unitsAvailable) * BigInt(contract.asset.unit.amount))) {
                const availableBalance = contract.balance / BigInt(contract.asset.unit.amount);
                const availableUnits = Math.floor(Number.parseInt(availableBalance.toString()));
                payments = contract.asset.payments + availableUnits;
                contract.balance -= BigInt(availableUnits) * BigInt(contract.asset.unit.amount);
                sender.balance += BigInt(availableUnits) * BigInt(contract.asset.unit.amount);
            }
            else {
                payments = contract.asset.payments + unitsAvailable;
                contract.balance -= BigInt(unitsAvailable) * BigInt(contract.asset.unit.amount);
                sender.balance += BigInt(unitsAvailable) * BigInt(contract.asset.unit.amount);
            }
            const updatedContract = {
                ...contract,
                asset: {
                    ...contract.asset,
                    state: payments < contract.asset.unit.total ? constants_1.STATES.ACTIVE : constants_1.STATES.ENDED,
                    payments: payments,
                },
            };
            store.account.set(updatedContract.address, new lisk_chain_1.Account(updatedContract));
            store.account.set(this.senderId, sender);
        }
        return errors;
    }
    async undoAsset(store) {
        const sender = await store.account.get(this.senderId);
        const contract = await store.account.getOrDefault(utils_1.getContractAddress(this.asset.contractPublicKey));
        const previousPayment = contract.asset.payments - (this.asset.unit - 1);
        contract.balance += BigInt(previousPayment) * BigInt(contract.asset.unit.amount);
        sender.balance -= BigInt(previousPayment) * BigInt(contract.asset.unit.amount);
        const updatedContract = {
            ...contract,
            asset: {
                ...contract.asset,
                state: constants_1.STATES.ACTIVE,
                payments: this.asset.unit - 1,
            },
        };
        store.account.set(updatedContract.address, new lisk_chain_1.Account(updatedContract));
        store.account.set(this.senderId, sender);
        return [];
    }
}
exports.RequestPayment = RequestPayment;
RequestPayment.TYPE = 13040;
//# sourceMappingURL=request.js.map