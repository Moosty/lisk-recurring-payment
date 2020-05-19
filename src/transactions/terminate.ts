import {stringToBuffer, getAddressFromPublicKey, intToBuffer} from '@liskhq/lisk-cryptography';
import {validator} from '@liskhq/lisk-validator';
import {
    BaseTransaction,
    StateStore,
    StateStorePrepare,
    TransactionError,
    convertToAssetError,
} from '@liskhq/lisk-transactions';
import {Account} from "@liskhq/lisk-chain";
import {AccountJSON} from '@liskhq/lisk-chain/dist-node/types';
import {PAYMENT_TYPE, STATES} from '../constants';
import {TerminateContractAssetSchema} from '../schemas';
import {TerminateTransactionJSON, TerminateAssetJSON, ContractInterface} from '../interfaces';
import {getContractAddress, getPastSlots} from "../utils";

export class TerminateContract extends BaseTransaction {
    readonly asset: TerminateAssetJSON;
    public static TYPE = 13050;

    public constructor(rawTransaction: unknown) {
        super(rawTransaction);
        const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
            ? rawTransaction
            : {}) as TerminateTransactionJSON;

        if (tx.asset) {
            this.asset = {
                ...tx.asset,
            } as TerminateAssetJSON;
        } else {
            this.asset = {} as TerminateAssetJSON;
        }
    }

    protected assetToBytes(): Buffer {
        const unitBuffer = intToBuffer(
            this.asset.unit, 2
        );

        const contractPublicKeyBuffer = this.asset.contractPublicKey
            ? stringToBuffer(this.asset.contractPublicKey)
            : Buffer.alloc(0);

        const peerPublicKeyBuffer = this.asset.peerPublicKey
            ? stringToBuffer(this.asset.peerPublicKey)
            : Buffer.alloc(0);

        const dataBuffer = this.asset.data
            ? stringToBuffer(this.asset.data)
            : Buffer.alloc(0);

        return Buffer.concat([
            unitBuffer,
            contractPublicKeyBuffer,
            peerPublicKeyBuffer,
            dataBuffer,
        ]);
    }

    public async prepare(store: StateStorePrepare): Promise<void> {
        await store.account.cache([
            {
                address: this.senderId,
            },
            {
                address: getContractAddress(this.asset.contractPublicKey),
            },
            {
                address: getAddressFromPublicKey(this.asset.peerPublicKey),
            },
        ]);
    }

    public assetToJSON(): object {
        return {
            ...this.asset,
        }
    }

    protected validateAsset(): ReadonlyArray<TransactionError> {
        const asset = this.assetToJSON();
        const schemaErrors = validator.validate(TerminateContractAssetSchema, asset);
        return convertToAssetError(
            this.id,
            schemaErrors,
        ) as TransactionError[];
    }

    protected async applyAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
        const errors: TransactionError[] = [];
        const contract = await store.account.getOrDefault(getContractAddress(this.asset.contractPublicKey)) as ContractInterface;
        const oldBalance = contract.balance;

        if (contract.asset.type !== PAYMENT_TYPE) {
            errors.push(
                new TransactionError(
                    '`contractPublicKey` not a recurring payment contract.',
                    this.id,
                    '.asset.contractPublicKey',
                    this.asset.contractPublicKey,
                ),
            );
        } else {

            if (contract.asset.recipientPublicKey !== this.senderPublicKey &&
                contract.asset.senderPublicKey !== this.senderPublicKey) {
                errors.push(
                    new TransactionError(
                        'Sender is not participant in contract',
                        this.id,
                        '.senderPublicKey',
                        this.senderPublicKey,
                        `${contract.asset.recipientPublicKey} | ${contract.asset.senderPublicKey}`
                    ),
                );
            }

            if (contract.asset.state !== STATES.ACTIVE) {
                errors.push(
                    new TransactionError(
                        'Contract is not in active state.',
                        this.id,
                        '.asset.contractPublicKey',
                        this.asset.contractPublicKey,
                    ),
                );
            }

            if (contract.asset.recipientPublicKey !== this.asset.peerPublicKey &&
                contract.asset.senderPublicKey !== this.asset.peerPublicKey) {
                errors.push(
                    new TransactionError(
                        'PeerPublicKey is not participant in contract',
                        this.id,
                        '.asset.peerPublicKey',
                        this.asset.peerPublicKey,
                        `${contract.asset.recipientPublicKey} | ${contract.asset.senderPublicKey}`
                    ),
                );
            }

            // get overdue payments first to recipient
            const unitsAvailable = getPastSlots(
                contract.asset.start,
                store.chain.lastBlockHeader.timestamp,
                contract.asset.unit.type,
                contract.asset.unit.typeAmount,
                contract.asset.payments
            );

            const sender = await store.account.getOrDefault(getAddressFromPublicKey(contract.asset.senderPublicKey));
            const recipient = await store.account.getOrDefault(getAddressFromPublicKey(contract.asset.recipientPublicKey));

            let payments = contract.asset.payments;
            if (contract.balance < BigInt(unitsAvailable) * BigInt(contract.asset.unit.amount)) {
                const availableBalance = contract.balance / (BigInt(unitsAvailable) * BigInt(contract.asset.unit.amount));
                const availableUnits = Math.floor(Number.parseInt(availableBalance.toString()));
                payments += availableUnits;
                contract.balance -= BigInt(availableUnits) * BigInt(contract.asset.unit.amount);
                recipient.balance += BigInt(availableUnits) * BigInt(contract.asset.unit.amount);
            } else {
                payments += unitsAvailable;
                contract.balance -= BigInt(unitsAvailable) * BigInt(contract.asset.unit.amount);
                recipient.balance += BigInt(unitsAvailable) * BigInt(contract.asset.unit.amount);
            }

            if (contract.balance > (BigInt(contract.asset.unit.terminateFee) * BigInt(contract.asset.unit.amount))) {
                sender.balance += contract.balance - (BigInt(contract.asset.unit.terminateFee) * BigInt(contract.asset.unit.amount));
                recipient.balance += BigInt(contract.asset.unit.terminateFee) * BigInt(contract.asset.unit.amount);
                contract.balance -= contract.balance;
            } else if (contract.balance <= (BigInt(contract.asset.unit.terminateFee) * BigInt(contract.asset.unit.amount))) {
                recipient.balance += contract.balance;
                contract.balance -= contract.balance;
            }

            // @ts-ignore
            const updatedContract = {
                ...contract,
                asset: {
                    ...contract.asset,
                    state: this.senderPublicKey === contract.asset.recipientPublicKey ?
                        STATES.TERMINATED_RECIPIENT : STATES.TERMINATED_SENDER,
                    lastBalance: oldBalance.toString(),
                    payments: payments,
                },
            } as AccountJSON;

            store.account.set(updatedContract.address, new Account(updatedContract));
            store.account.set(sender.address, sender);
            store.account.set(recipient.address, recipient);
        }
        return errors;
    }

    protected async undoAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
        const contract = await store.account.getOrDefault(getContractAddress(this.asset.contractPublicKey)) as ContractInterface;
        const oldBalance = BigInt(contract.asset.lastBalance);
        const sender = await store.account.getOrDefault(getAddressFromPublicKey(contract.asset.senderPublicKey));
        const recipient = await store.account.getOrDefault(getAddressFromPublicKey(contract.asset.recipientPublicKey));
        const previousPayment = contract.asset.payments - (this.asset.unit - 1);
        contract.balance += BigInt(previousPayment) * BigInt(contract.asset.unit.amount);
        recipient.balance -= BigInt(previousPayment) * BigInt(contract.asset.unit.amount);
        const leftOverBalance = oldBalance - BigInt(previousPayment) * BigInt(contract.asset.unit.amount);

        if (leftOverBalance > (BigInt(contract.asset.unit.terminateFee) * BigInt(contract.asset.unit.amount))) {
            sender.balance -= leftOverBalance - (BigInt(contract.asset.unit.terminateFee) * BigInt(contract.asset.unit.amount));
            recipient.balance -= BigInt(contract.asset.unit.terminateFee) * BigInt(contract.asset.unit.amount);
            contract.balance += leftOverBalance;
        } else if (leftOverBalance <= (BigInt(contract.asset.unit.terminateFee) * BigInt(contract.asset.unit.amount))) {
            recipient.balance -= leftOverBalance;
            contract.balance += leftOverBalance;
        }

        // @ts-ignore
        const updatedContract = {
            ...contract,
            asset: {
                state: STATES.ACTIVE,
                lastBalance: "",
            },
        } as AccountJSON;

        store.account.set(updatedContract.address, new Account(updatedContract));
        store.account.set(sender.address, sender);
        store.account.set(recipient.address, recipient);

        return [];
    }
}
