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
import {TYPES, PAYMENT_TYPE, STATES} from '../constants';
import {CreateContractAssetSchema} from '../schemas';
import {CreateTransactionJSON, CreateAssetJSON} from '../interfaces';
import {getContractAddress, assetBytesToPublicKey} from '../utils';
import {Account } from "@liskhq/lisk-chain";
import { AccountJSON } from '@liskhq/lisk-chain/dist-node/types';
import { accountDefaultValues } from '@liskhq/lisk-chain/dist-node/account';

export class CreateContract extends BaseTransaction {
    public readonly asset: CreateAssetJSON;
    public static TYPE = 13010;

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

    public getContractPublicKey(): string {
        return assetBytesToPublicKey(this.assetToBytes().toString());
    }

    public getContractId(): string {
        return getContractAddress(this.getContractPublicKey());
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

        const timestampBuffer = intToBuffer(
            this.asset.timestamp, 4
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

        const titleBuffer = this.asset.title
            ? stringToBuffer(this.asset.title)
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

    public async prepare(store: StateStorePrepare): Promise<void> {
        await store.account.cache([
            {
                address: this.senderId,
            },
            {
                address: this.getContractId(),
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

        if (this.asset.contractPublicKey && this.asset.contractPublicKey !== this.getContractPublicKey()) {
            errors.push(
                new TransactionError(
                    '`.asset.contractPublicKey` should be different.',
                    this.id,
                    '.asset.contractPublicKey',
                    this.asset.contractPublicKey,
                    this.getContractPublicKey()
                ),
            );
        }

        return errors;
    }

    protected async applyAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
        const errors: TransactionError[] = [];
        const contract = await store.account.getOrDefault(this.getContractId());
        if (contract.balance > BigInt(0) || contract.publicKey !== this.asset.contractPublicKey || Object.keys(contract.asset).length > 0) {
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
            ...accountDefaultValues,
            address: this.getContractId(),
            publicKey: this.getContractPublicKey(),
            asset: {
                type: PAYMENT_TYPE,
                rev: 0,
                state: this.asset.senderPublicKey === this.senderPublicKey ? STATES.RECIPIENT_REVIEW : STATES.SENDER_REVIEW,
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
        } as AccountJSON;

        store.account.set(contract.address, new Account(updatedContract));
        return errors;
    }

    protected async undoAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
        const contract = await store.account.getOrDefault(this.getContractId());
        // @ts-ignore
        const updatedContract = {
            ...contract,
            asset: {},
        } as AccountJSON;
        store.account.set(updatedContract.address, new Account(updatedContract));

        return [];
    }
}
