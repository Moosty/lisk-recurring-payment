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
import {ReviewContractAssetSchema} from '../schemas';
import {ReviewTransactionJSON, ReviewAssetJSON, ContractInterface} from '../interfaces';
import {getContractAddress} from '../utils';

export class ReviewContract extends BaseTransaction {
    public readonly asset: ReviewAssetJSON;
    public readonly TYPE = 124;

    public constructor(rawTransaction: unknown) {
        super(rawTransaction);
        const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
            ? rawTransaction
            : {}) as Partial<ReviewTransactionJSON>;

        if (tx.asset) {
            this.asset = {
                ...tx.asset,
            } as ReviewAssetJSON;
        } else {
            this.asset = {} as ReviewAssetJSON;
        }
    }

    protected assetToBytes(): Buffer {
        if (this.asset.accept) {
            const contractPublicKeyBuffer = stringToBuffer(this.asset.contractPublicKey);

            const dataBuffer = this.asset.data
                ? stringToBuffer(this.asset.data)
                : Buffer.alloc(0);

            return Buffer.concat([
                contractPublicKeyBuffer,
                dataBuffer,
            ]);
        } else {
            const contractPublicKeyBuffer = stringToBuffer(this.asset.contractPublicKey);

            const unitAmount = this.asset.unit && this.asset.unit.amount
                ? intToBuffer(this.asset.unit.amount.toString(), constants.BYTESIZES.AMOUNT, 'big')
                : Buffer.alloc(0);

            const typeBuffer = this.asset.unit && this.asset.unit.type
                ? intToBuffer(TYPES.indexOf(this.asset.unit.type), 2)
                : Buffer.alloc(0);

            const typeAmountBuffer = this.asset.unit && this.asset.unit.typeAmount
                ? intToBuffer(this.asset.unit.typeAmount, 2)
                : Buffer.alloc(0);

            const prepaidBuffer = this.asset.unit && this.asset.unit.prepaid
                ? intToBuffer(this.asset.unit.prepaid, 2)
                : Buffer.alloc(0);

            const totalBuffer = this.asset.unit && this.asset.unit.total
                ? intToBuffer(this.asset.unit.total, 2)
                : Buffer.alloc(0);

            const terminateFeeBuffer = this.asset.unit && this.asset.unit.terminateFee
                ? intToBuffer(this.asset.unit.terminateFee, 2)
                : Buffer.alloc(0);

            const dataBuffer = this.asset.data
                ? stringToBuffer(this.asset.data)
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
        const schemaErrors = validator.validate(ReviewContractAssetSchema, asset);
        const errors = convertToAssetError(
            this.id,
            schemaErrors,
        ) as TransactionError[];

        return errors;
    }

    protected async applyAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
        const errors: TransactionError[] = [];
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

        if (contract.asset.senderPublicKey !== this.senderPublicKey && contract.asset.recipientPublicKey !== this.senderPublicKey) {
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

        if (contract.asset.state !== STATES.SENDER_REVIEW && contract.asset.state !== STATES.RECIPIENT_REVIEW) {
            errors.push(
                new TransactionError(
                    'Contract is not in review state.',
                    this.id,
                    '.asset.contractPublicKey',
                    this.asset.contractPublicKey,
                ),
            );
        }

        if ((contract.asset.state === STATES.SENDER_REVIEW &&
                contract.asset.recipientPublicKey === this.senderPublicKey) ||
            (contract.asset.state === STATES.RECIPIENT_REVIEW &&
                contract.asset.senderPublicKey === this.senderPublicKey)) {
            errors.push(
                new TransactionError(
                    'The other party needs to review the contract',
                    this.id,
                    '.asset.contractPublicKey',
                    this.asset.contractPublicKey,
                ),
            );
        }

        if (this.asset.accept) {
            store.account.set(contract.address, {
                ...contract,
                asset: {
                    ...contract.asset,
                    state: STATES.ACCEPTED,
                    start: store.chain.lastBlockHeader.timestamp
                },
            });
        } else if (!this.asset.accept) {

            if (contract.asset.rev === 10) {
                errors.push(
                    new TransactionError(
                        'To many revisions made create a new contract',
                        this.id,
                        '.rev',
                        contract.asset.rev,
                        `< 10`
                    ),
                );
            }

            store.account.set(contract.address, {
                ...contract,
                asset: {
                    ...contract.asset,
                    type: PAYMENT_TYPE,
                    state: contract.asset.senderPublicKey === this.senderPublicKey ? STATES.RECIPIENT_REVIEW : STATES.SENDER_REVIEW,
                    rev: contract.asset.rev + 1,
                    unit: {
                        ...contract.asset.unit,
                        ...this.asset.unit,
                    },
                },
            });
        }

        return errors;
    }

    protected async undoAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
        const contract = await store.account.getOrDefault(getContractAddress(this.asset.contractPublicKey)) as ContractInterface;
        if (this.asset.accept) {
            store.account.set(contract.address, {
                ...contract,
                asset: {
                    ...contract.asset,
                    state: contract.asset.senderPublicKey === this.senderPublicKey ? STATES.SENDER_REVIEW : STATES.RECIPIENT_REVIEW,
                },
            });
        } else if (!this.asset.accept) {
            // todo reverse revision
            const updatedContract = {
                ...contract,
                asset: {},
            };
            store.account.set(updatedContract.address, updatedContract);
        }
        return [];
    }
}
