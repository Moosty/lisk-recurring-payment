"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lisk_cryptography_1 = require("@liskhq/lisk-cryptography");
const lisk_validator_1 = require("@liskhq/lisk-validator");
const lisk_transactions_1 = require("@liskhq/lisk-transactions");
const lisk_chain_1 = require("@liskhq/lisk-chain");
const constants_1 = require("../constants");
const schemas_1 = require("../schemas");
const utils_1 = require("../utils");
class FundContract extends lisk_transactions_1.BaseTransaction {
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
        const unitsBuffer = lisk_cryptography_1.intToBuffer(this.asset.units, 2);
        const contractPublicKeyBuffer = this.asset.contractPublicKey
            ? lisk_cryptography_1.stringToBuffer(this.asset.contractPublicKey)
            : Buffer.alloc(0);
        const dataBuffer = this.asset.data
            ? lisk_cryptography_1.stringToBuffer(this.asset.data)
            : Buffer.alloc(0);
        return Buffer.concat([
            contractPublicKeyBuffer,
            unitsBuffer,
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
        const schemaErrors = lisk_validator_1.validator.validate(schemas_1.FundAssetSchema, asset);
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
            if (contract.asset.senderPublicKey !== this.senderPublicKey) {
                errors.push(new lisk_transactions_1.TransactionError('Sender is not sender in this contract', this.id, '.senderPublicKey', this.senderPublicKey, contract.asset.senderPublicKey));
            }
            if (contract.asset.state !== constants_1.STATES.ACTIVE && contract.asset.state !== constants_1.STATES.ACCEPTED) {
                errors.push(new lisk_transactions_1.TransactionError('Recurring payment contract is not accepted nor active', this.id, '.state', contract.asset.state, `${constants_1.STATES.ACTIVE} | ${constants_1.STATES.ACCEPTED}`));
            }
            if (contract.asset.state === constants_1.STATES.ACCEPTED && contract.asset.unit.prepaid > 0 && this.asset.units < contract.asset.unit.prepaid) {
                errors.push(new lisk_transactions_1.TransactionError('There is a prepaid minimum', this.id, '.asset.units', this.asset.units, `> ${contract.asset.unit.prepaid}`));
            }
            if (contract.asset.unit.total - contract.asset.payments < this.asset.units) {
                errors.push(new lisk_transactions_1.TransactionError('Too many `.asset.units` for this contract', this.id, '.asset.units', this.asset.units, `< ${contract.asset.unit.total - contract.asset.payments}`));
            }
            if (sender.balance < (BigInt(contract.asset.unit.amount) * BigInt(this.asset.units))) {
                errors.push(new lisk_transactions_1.TransactionError('Senders balance is too low', this.id, '.balance', sender.balance.toString(), `>= ${(BigInt(contract.asset.unit.amount) * BigInt(this.asset.units)).toString()}`));
            }
            contract.balance += BigInt(contract.asset.unit.amount) * BigInt(this.asset.units);
            const updatedContract = {
                ...contract,
                asset: {
                    ...contract.asset,
                    state: constants_1.STATES.ACTIVE,
                    start: contract.asset.state === constants_1.STATES.ACCEPTED ? store.chain.lastBlockHeader.timestamp : contract.asset.start,
                },
            };
            store.account.set(updatedContract.address, new lisk_chain_1.Account(updatedContract));
            sender.balance -= BigInt(contract.asset.unit.amount) * BigInt(this.asset.units);
            store.account.set(this.senderId, sender);
        }
        return errors;
    }
    async undoAsset(store) {
        const sender = await store.account.get(this.senderId);
        const contract = await store.account.getOrDefault(utils_1.getContractAddress(this.asset.contractPublicKey));
        contract.balance -= BigInt(contract.asset.unit.amount) * BigInt(this.asset.units);
        const updatedContract = {
            ...contract,
            asset: {
                ...contract.asset,
                state: contract.balance > BigInt(contract.asset.unit.prepaid || 1) * BigInt(contract.asset.unit.amount) || contract.asset.payments > 0 ? constants_1.STATES.ACTIVE : constants_1.STATES.ACCEPTED,
            },
        };
        store.account.set(updatedContract.address, new lisk_chain_1.Account(updatedContract));
        sender.balance += BigInt(contract.asset.unit.amount) * BigInt(this.asset.units);
        store.account.set(this.senderId, sender);
        return [];
    }
}
exports.FundContract = FundContract;
FundContract.TYPE = 13030;
//# sourceMappingURL=fund.js.map