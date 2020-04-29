import {stringToBuffer, intToBuffer} from '@liskhq/lisk-cryptography';
import {validator} from '@liskhq/lisk-validator';
import {
    BaseTransaction,
    StateStore,
    StateStorePrepare,
    TransactionError,
    convertToAssetError,
    constants,
} from '@liskhq/lisk-transactions';
import {TYPES, PAYMENT_TYPE} from '../constants';
import {CreateContractAssetSchema} from '../schemas';
import {CreateTransactionJSON, CreateAssetJSON} from '../interfaces';

export class RequestPayment extends BaseTransaction {
    readonly asset: CreateAssetJSON;

    public constructor(rawTransaction: unknown) {
        super(rawTransaction);
        const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
            ? rawTransaction
            : {}) as Partial<CreateTransactionJSON>;

        if (tx.asset) {
            this.asset = {
                ...tx.asset,
            } as CreateAssetJSON;
        } else {
            this.asset = {} as CreateAssetJSON;
        }
    }

    protected assetToBytes(): Buffer {
        const unitAmount = intToBuffer(
            this.asset.unit.amount.toString(),
            constants.BYTESIZES.AMOUNT,
            'big',
        );

        const typeBuffer = intToBuffer(
            TYPES.indexOf(this.asset.unit.type),
            2
        );

        const typeAmountBuffer = intToBuffer(
            this.asset.unit.typeAmount, 2
        );
        const prepaidBuffer = intToBuffer(
            this.asset.unit.prepaid, 2
        );

        const totalBuffer = intToBuffer(
            this.asset.unit.total, 2
        );

        const terminateFeeBuffer = intToBuffer(
            this.asset.unit.terminateFee, 2
        );

        const contractPublicKeyBuffer = this.asset.contractPublicKey
            ? stringToBuffer(this.asset.contractPublicKey)
            : Buffer.alloc(0);

        const recipientPublicKeyBuffer = this.asset.recipientPublicKey
            ? stringToBuffer(this.asset.recipientPublicKey)
            : Buffer.alloc(0);

        const senderPublicKeyBuffer = this.asset.senderPublicKey
            ? stringToBuffer(this.asset.senderPublicKey)
            : Buffer.alloc(0);

        const dataBuffer = this.asset.data
            ? stringToBuffer(this.asset.data)
            : Buffer.alloc(0);

        return Buffer.concat([
            contractPublicKeyBuffer,
            recipientPublicKeyBuffer,
            senderPublicKeyBuffer,
            typeBuffer,
            typeAmountBuffer,
            unitAmount,
            prepaidBuffer,
            totalBuffer,
            terminateFeeBuffer,
            dataBuffer,
        ]);
    }

    public async prepare(store: StateStorePrepare): Promise<void> {
        await store.account.cache([
            {
                address: this.senderId,
            },
            {
                publicKey: this.asset.senderPublicKey,
            },
            {
                publicKey: this.asset.recipientPublicKey,
            },
        ]);
    }

    public assetToJSON(): object {
        return {
            ...this.asset,
            unit: {
                ...this.asset.unit,
                amount: this.asset.unit.amount.toString(),
            }
        }
    }

    protected validateAsset(): ReadonlyArray<TransactionError> {
        const asset = this.assetToJSON();
        const schemaErrors = validator.validate(CreateContractAssetSchema, asset);
        const errors = convertToAssetError(
            this.id,
            schemaErrors,
        ) as TransactionError[];


        if (this.senderPublicKey !== this.asset.recipientPublicKey && this.senderPublicKey !== this.asset.senderPublicKey) {
            errors.push(
                new TransactionError(
                    '`.asset.recipientPublicKey` or `.asset.senderPublicKey` should be the same as `senderPublicKey`.',
                    this.id,
                    '.senderPublicKey',
                    this.senderPublicKey,
                    `${this.asset.recipientPublicKey} | ${this.asset.senderPublicKey}`
                ),
            );
        }
        // todo: what to check

        return errors;
    }

    protected async applyAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
        const errors: TransactionError[] = [];
        const contract = await store.account.getOrDefault(this.senderId);

        if (contract.balance > 0 || contract.publicKey !== this.asset.contractPublicKey || Object.keys(contract.asset).length > 0) {
            errors.push(
                new TransactionError(
                    '`contractPublicKey` already exists.',
                    this.id,
                    '.contractPublicKey',
                    this.asset.contractPublicKey,
                ),
            );
        }

        const updatedContract = {
            ...contract,
            publicKey: this.asset.contractPublicKey,
            asset: {
                type: PAYMENT_TYPE,
                unit: {
                    ...this.asset.unit,
                },
                recipientPublicKey: this.asset.recipientPublicKey,
                senderPublicKey: this.asset.senderPublicKey,
            },
        };
        store.account.set(updatedContract.address, updatedContract);

        return errors;
    }

    protected async undoAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
        const contract = await store.account.getOrDefault(this.senderId);
        const updatedContract = {
            ...contract,
            asset: {},
            publicKey: "",
        };
        store.account.set(updatedContract.address, updatedContract);

        return [];
    }
}
