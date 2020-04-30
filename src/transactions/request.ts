import {stringToBuffer, intToBuffer} from '@liskhq/lisk-cryptography';
import {validator} from '@liskhq/lisk-validator';
import {
    BaseTransaction,
    StateStore,
    StateStorePrepare,
    TransactionError,
    convertToAssetError,
} from '@liskhq/lisk-transactions';
import { PAYMENT_TYPE, STATES} from '../constants';
import {CreateContractAssetSchema} from '../schemas';
import {RequestTransactionJSON, RequestAssetJSON, ContractInterface} from '../interfaces';
import {getContractAddress} from "../utils";

export class RequestPayment extends BaseTransaction {
    readonly asset: RequestAssetJSON;

    public constructor(rawTransaction: unknown) {
        super(rawTransaction);
        const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
            ? rawTransaction
            : {}) as Partial<RequestTransactionJSON>;

        if (tx.asset) {
            this.asset = {
                ...tx.asset,
            } as RequestAssetJSON;
        } else {
            this.asset = {} as RequestAssetJSON;
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
        const schemaErrors = validator.validate(CreateContractAssetSchema, asset);
        return convertToAssetError(
            this.id,
            schemaErrors,
        ) as TransactionError[];
    }

    protected async applyAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
        const errors: TransactionError[] = [];
        const sender = await store.account.get(this.senderId);
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
        }

        if (contract.asset.recipientPublicKey !== this.senderPublicKey) {
            errors.push(
                new TransactionError(
                    'Sender is not recipient in contract',
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
                    'Wrong unit number',
                    this.id,
                    '.unit',
                    this.asset.unit,
                    contract.asset.payments + 1
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

        contract.balance -= BigInt(contract.asset.unit.amount);

        const updatedContract: ContractInterface = {
            ...contract,
            asset: {
                ...contract.asset,
                state: this.asset.unit < contract.asset.unit.total ? STATES.ACTIVE : STATES.ENDED,
                payments: contract.asset.payments + 1,
            },
        };
        store.account.set(updatedContract.address, updatedContract);

        sender.balance += BigInt(contract.asset.unit.amount);
        store.account.set(this.senderId, sender);

        return errors;
    }

    protected async undoAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
        const sender = await store.account.get(this.senderId);
        const contract = await store.account.getOrDefault(getContractAddress(this.asset.contractPublicKey)) as ContractInterface;
        contract.balance += BigInt(contract.asset.unit.amount);

        const updatedContract = {
            ...contract,
            asset: {
                ...contract.asset,
                state: STATES.ACTIVE,
                payments: contract.asset.payments - 1,
            },
        };
        store.account.set(updatedContract.address, updatedContract);

        sender.balance -= BigInt(contract.asset.unit.amount);
        store.account.set(this.senderId, sender);
        return [];
    }
}
