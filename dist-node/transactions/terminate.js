"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lisk_cryptography_1 = require("@liskhq/lisk-cryptography");
const lisk_validator_1 = require("@liskhq/lisk-validator");
const lisk_transactions_1 = require("@liskhq/lisk-transactions");
const lisk_chain_1 = require("@liskhq/lisk-chain");
const constants_1 = require("../constants");
const schemas_1 = require("../schemas");
const utils_1 = require("../utils");
class TerminateContract extends lisk_transactions_1.BaseTransaction {
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
        const unitBuffer = lisk_cryptography_1.intToBuffer(this.asset.unit, 2);
        const contractPublicKeyBuffer = this.asset.contractPublicKey
            ? lisk_cryptography_1.stringToBuffer(this.asset.contractPublicKey)
            : Buffer.alloc(0);
        const peerPublicKeyBuffer = this.asset.peerPublicKey
            ? lisk_cryptography_1.stringToBuffer(this.asset.peerPublicKey)
            : Buffer.alloc(0);
        const dataBuffer = this.asset.data
            ? lisk_cryptography_1.stringToBuffer(this.asset.data)
            : Buffer.alloc(0);
        return Buffer.concat([
            unitBuffer,
            contractPublicKeyBuffer,
            peerPublicKeyBuffer,
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
            {
                address: lisk_cryptography_1.getAddressFromPublicKey(this.asset.peerPublicKey),
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
        const schemaErrors = lisk_validator_1.validator.validate(schemas_1.TerminateContractAssetSchema, asset);
        return lisk_transactions_1.convertToAssetError(this.id, schemaErrors);
    }
    async applyAsset(store) {
        const errors = [];
        const contract = await store.account.getOrDefault(utils_1.getContractAddress(this.asset.contractPublicKey));
        const oldBalance = contract.balance;
        if (contract.asset.type !== constants_1.PAYMENT_TYPE) {
            errors.push(new lisk_transactions_1.TransactionError('`contractPublicKey` not a recurring payment contract.', this.id, '.asset.contractPublicKey', this.asset.contractPublicKey));
        }
        else {
            if (contract.asset.recipientPublicKey !== this.senderPublicKey &&
                contract.asset.senderPublicKey !== this.senderPublicKey) {
                errors.push(new lisk_transactions_1.TransactionError('Sender is not participant in contract', this.id, '.senderPublicKey', this.senderPublicKey, `${contract.asset.recipientPublicKey} | ${contract.asset.senderPublicKey}`));
            }
            if (contract.asset.state !== constants_1.STATES.ACTIVE) {
                errors.push(new lisk_transactions_1.TransactionError('Contract is not in active state.', this.id, '.asset.contractPublicKey', this.asset.contractPublicKey));
            }
            if (contract.asset.recipientPublicKey !== this.asset.peerPublicKey &&
                contract.asset.senderPublicKey !== this.asset.peerPublicKey) {
                errors.push(new lisk_transactions_1.TransactionError('PeerPublicKey is not participant in contract', this.id, '.asset.peerPublicKey', this.asset.peerPublicKey, `${contract.asset.recipientPublicKey} | ${contract.asset.senderPublicKey}`));
            }
            const unitsAvailable = utils_1.getPastSlots(contract.asset.start, store.chain.lastBlockHeader.timestamp, contract.asset.unit.type, contract.asset.unit.typeAmount, contract.asset.payments);
            const sender = await store.account.getOrDefault(lisk_cryptography_1.getAddressFromPublicKey(contract.asset.senderPublicKey));
            const recipient = await store.account.getOrDefault(lisk_cryptography_1.getAddressFromPublicKey(contract.asset.recipientPublicKey));
            let payments = contract.asset.payments;
            if (contract.balance < BigInt(unitsAvailable) * BigInt(contract.asset.unit.amount)) {
                const availableBalance = contract.balance / (BigInt(unitsAvailable) * BigInt(contract.asset.unit.amount));
                const availableUnits = Math.floor(Number.parseInt(availableBalance.toString()));
                payments += availableUnits;
                contract.balance -= BigInt(availableUnits) * BigInt(contract.asset.unit.amount);
                recipient.balance += BigInt(availableUnits) * BigInt(contract.asset.unit.amount);
            }
            else {
                payments += unitsAvailable;
                contract.balance -= BigInt(unitsAvailable) * BigInt(contract.asset.unit.amount);
                recipient.balance += BigInt(unitsAvailable) * BigInt(contract.asset.unit.amount);
            }
            if (contract.balance > (BigInt(contract.asset.unit.terminateFee) * BigInt(contract.asset.unit.amount))) {
                sender.balance += contract.balance - (BigInt(contract.asset.unit.terminateFee) * BigInt(contract.asset.unit.amount));
                recipient.balance += BigInt(contract.asset.unit.terminateFee) * BigInt(contract.asset.unit.amount);
                contract.balance -= contract.balance;
            }
            else if (contract.balance <= (BigInt(contract.asset.unit.terminateFee) * BigInt(contract.asset.unit.amount))) {
                recipient.balance += contract.balance;
                contract.balance -= contract.balance;
            }
            const updatedContract = {
                ...contract,
                asset: {
                    ...contract.asset,
                    state: this.senderPublicKey === contract.asset.recipientPublicKey ?
                        constants_1.STATES.TERMINATED_RECIPIENT : constants_1.STATES.TERMINATED_SENDER,
                    lastBalance: oldBalance.toString(),
                    payments: payments,
                },
            };
            store.account.set(updatedContract.address, new lisk_chain_1.Account(updatedContract));
            store.account.set(sender.address, sender);
            store.account.set(recipient.address, recipient);
        }
        return errors;
    }
    async undoAsset(store) {
        const contract = await store.account.getOrDefault(utils_1.getContractAddress(this.asset.contractPublicKey));
        const oldBalance = BigInt(contract.asset.lastBalance);
        const sender = await store.account.getOrDefault(lisk_cryptography_1.getAddressFromPublicKey(contract.asset.senderPublicKey));
        const recipient = await store.account.getOrDefault(lisk_cryptography_1.getAddressFromPublicKey(contract.asset.recipientPublicKey));
        const previousPayment = contract.asset.payments - (this.asset.unit - 1);
        contract.balance += BigInt(previousPayment) * BigInt(contract.asset.unit.amount);
        recipient.balance -= BigInt(previousPayment) * BigInt(contract.asset.unit.amount);
        const leftOverBalance = oldBalance - BigInt(previousPayment) * BigInt(contract.asset.unit.amount);
        if (leftOverBalance > (BigInt(contract.asset.unit.terminateFee) * BigInt(contract.asset.unit.amount))) {
            sender.balance -= leftOverBalance - (BigInt(contract.asset.unit.terminateFee) * BigInt(contract.asset.unit.amount));
            recipient.balance -= BigInt(contract.asset.unit.terminateFee) * BigInt(contract.asset.unit.amount);
            contract.balance += leftOverBalance;
        }
        else if (leftOverBalance <= (BigInt(contract.asset.unit.terminateFee) * BigInt(contract.asset.unit.amount))) {
            recipient.balance -= leftOverBalance;
            contract.balance += leftOverBalance;
        }
        const updatedContract = {
            ...contract,
            asset: {
                state: constants_1.STATES.ACTIVE,
                lastBalance: "",
            },
        };
        store.account.set(updatedContract.address, new lisk_chain_1.Account(updatedContract));
        store.account.set(sender.address, sender);
        store.account.set(recipient.address, recipient);
        return [];
    }
}
exports.TerminateContract = TerminateContract;
TerminateContract.TYPE = 13050;
//# sourceMappingURL=terminate.js.map