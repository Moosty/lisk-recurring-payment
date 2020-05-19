import {stringToBuffer, intToBuffer} from '@liskhq/lisk-cryptography';
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
import {RequestPaymentAssetSchema} from '../schemas';
import {RequestTransactionJSON, RequestAssetJSON, ContractInterface} from '../interfaces';
import {getContractAddress, getNextSlot, getPastSlots} from "../utils";

export class RequestPayment extends BaseTransaction {
    readonly asset = {} as RequestAssetJSON;
    public static TYPE = 13040;

    public constructor(rawTransaction: unknown) {
        super(rawTransaction);
        const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
            ? rawTransaction
            : {}) as Partial<RequestTransactionJSON>;

        if (tx.asset) {
            this.asset = {
                ...tx.asset,
            } as RequestAssetJSON;
        }
    }

    protected assetToBytes(): Buffer {
        const unitBuffer = intToBuffer(
            this.asset.unit, 2
        );

        const contractPublicKeyBuffer = this.asset.contractPublicKey
            ? stringToBuffer(this.asset.contractPublicKey)
            : Buffer.alloc(0);

        const dataBuffer = this.asset.data
            ? stringToBuffer(this.asset.data)
            : Buffer.alloc(0);

        return Buffer.concat([
            contractPublicKeyBuffer,
            unitBuffer,
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
        ]);
    }

    public assetToJSON(): object {
        return {
            ...this.asset,
        }
    }

    protected validateAsset(): ReadonlyArray<TransactionError> {
        const asset = this.assetToJSON();
        const schemaErrors = validator.validate(RequestPaymentAssetSchema, asset);
        return convertToAssetError(
            this.id,
            schemaErrors,
        ) as TransactionError[];
    }

    protected async applyAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
        const errors: TransactionError[] = [];
        const sender = await store.account.getOrDefault(this.senderId);
        const contract = await store.account.getOrDefault(getContractAddress(this.asset.contractPublicKey)) as ContractInterface;
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
            if (contract.asset.recipientPublicKey !== this.senderPublicKey) {
                errors.push(
                    new TransactionError(
                        'Sender is not recipient in this contract',
                        this.id,
                        '.senderPublicKey',
                        this.senderPublicKey,
                        contract.asset.recipientPublicKey
                    ),
                );
            }

            if (contract.asset.state !== STATES.ACTIVE) {
                errors.push(
                    new TransactionError(
                        'Recurring payment contract is not active',
                        this.id,
                        '.state',
                        contract.asset.state,
                        STATES.ACTIVE
                    ),
                );
            }

            if (contract.asset.payments + 1 !== this.asset.unit) {
                errors.push(
                    new TransactionError(
                        'Wrong `.asset.unit` number given',
                        this.id,
                        '.asset.unit',
                        this.asset.unit,
                        contract.asset.payments + 1
                    ),
                );
            }

            const nextSlot = getNextSlot(contract.asset.start, contract.asset.unit.type, contract.asset.unit.typeAmount, contract.asset.payments);
            if (nextSlot > store.chain.lastBlockHeader.timestamp) {
                errors.push(
                    new TransactionError(
                        'No unlocked tokens available',
                        this.id,
                        '.timestamp',
                        store.chain.lastBlockHeader.timestamp,
                        `>= ${nextSlot}`
                    ),
                );
            }

            if (contract.balance < BigInt(contract.asset.unit.amount)) {
                errors.push(
                    new TransactionError(
                        'Contract balance is too low',
                        this.id,
                        '.balance',
                        contract.balance.toString(),
                        `> ${contract.asset.unit.amount}`
                    ),
                );
            }

            const unitsAvailable = getPastSlots(
                contract.asset.start,
                store.chain.lastBlockHeader.timestamp,
                contract.asset.unit.type,
                contract.asset.unit.typeAmount,
                contract.asset.payments
            );

            let payments = 0;
            if (contract.balance <= BigInt(BigInt(unitsAvailable) * BigInt(contract.asset.unit.amount))) {
                const availableBalance = contract.balance / BigInt(contract.asset.unit.amount);
                const availableUnits = Math.floor(Number.parseInt(availableBalance.toString()));
                payments = contract.asset.payments + availableUnits;
                contract.balance -= BigInt(availableUnits) * BigInt(contract.asset.unit.amount);
                sender.balance += BigInt(availableUnits) * BigInt(contract.asset.unit.amount);
            } else {
                payments = contract.asset.payments + unitsAvailable;
                contract.balance -= BigInt(unitsAvailable) * BigInt(contract.asset.unit.amount);
                sender.balance += BigInt(unitsAvailable) * BigInt(contract.asset.unit.amount);
            }
            // @ts-ignore
            const updatedContract = {
                ...contract,
                asset: {
                    ...contract.asset,
                    state: payments < contract.asset.unit.total ? STATES.ACTIVE : STATES.ENDED,
                    payments: payments,
                },
            } as AccountJSON;
            store.account.set(updatedContract.address, new Account(updatedContract));
            store.account.set(this.senderId, sender);
        }
        return errors;
    }

    protected async undoAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
        const sender = await store.account.get(this.senderId);
        const contract = await store.account.getOrDefault(getContractAddress(this.asset.contractPublicKey)) as ContractInterface;
        const previousPayment = contract.asset.payments - (this.asset.unit - 1);
        contract.balance += BigInt(previousPayment) * BigInt(contract.asset.unit.amount);
        sender.balance -= BigInt(previousPayment) * BigInt(contract.asset.unit.amount);

        // @ts-ignore
        const updatedContract = {
            ...contract,
            asset: {
                ...contract.asset,
                state: STATES.ACTIVE,
                payments: this.asset.unit - 1,
            },
        } as AccountJSON;
        store.account.set(updatedContract.address, new Account(updatedContract));
        store.account.set(this.senderId, sender);
        return [];
    }
}
