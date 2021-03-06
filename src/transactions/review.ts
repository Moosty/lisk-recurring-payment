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
import {Account} from "@liskhq/lisk-chain";
import {AccountJSON} from '@liskhq/lisk-chain/dist-node/types';
import _ from 'lodash';
import {TYPES, PAYMENT_TYPE, STATES} from '../constants';
import {ReviewContractAssetSchema} from '../schemas';
import {ReviewTransactionJSON, ReviewAssetJSON, ContractInterface} from '../interfaces';
import {getContractAddress} from '../utils';

export class ReviewContract extends BaseTransaction {
    public readonly asset: ReviewAssetJSON;
    public static TYPE = 13020;

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

        if (this.asset.accept && (this.asset.unit || this.asset.unitOld)) {
            errors.push(
                new TransactionError(
                    'When `.asset.accept === true`, `.asset.unit` and `.asset.unitOld` are not allowed.',
                    this.id,
                    '.asset.accept',
                    `${this.asset.accept}`,
                ),
            );
        }

        if (!this.asset.accept && !this.asset.unitOld) {
            errors.push(
                new TransactionError(
                    'Missing `.asset.unitOld`.',
                    this.id,
                    '.asset.unitOld',
                ),
            );
        }

        if (!this.asset.accept && !this.asset.unit) {
            errors.push(
                new TransactionError(
                    'Missing `.asset.unit`.',
                    this.id,
                    '.asset.unit',
                ),
            );
        }

        if (!this.asset.accept && this.asset.unitOld && this.asset.unit) {
            const unitKeys = Object.keys(this.asset.unit);
            const unitOldKeys = Object.keys(this.asset.unitOld);
            if (!_.isEqual(unitKeys, unitOldKeys)) {
                errors.push(
                    new TransactionError(
                        '`.asset.unit` and `.asset.unitOld` should have the same keys.',
                        this.id,
                        '.asset.unit',
                        JSON.stringify(unitKeys),
                        JSON.stringify(unitOldKeys),
                    ),
                );
            }
        }

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
        } else {

            if (contract.asset.senderPublicKey !== this.senderPublicKey &&
                contract.asset.recipientPublicKey !== this.senderPublicKey) {
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
                contract.asset.senderPublicKey !== this.senderPublicKey) ||
                (contract.asset.state === STATES.RECIPIENT_REVIEW &&
                    contract.asset.recipientPublicKey !== this.senderPublicKey)) {
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
                // @ts-ignore
                store.account.set(contract.address, new Account({
                    ...contract,
                    asset: {
                        ...contract.asset,
                        state: STATES.ACCEPTED,
                        start: store.chain.lastBlockHeader.timestamp
                    },
                }));
            } else if (!this.asset.accept) {
                if (contract.asset.type && contract.asset.type === PAYMENT_TYPE) {
                    _.map(this.asset.unitOld, (value, key) => {
                        if (contract.asset.unit[key] !== value) {
                            errors.push(
                                new TransactionError(
                                    `'.asset.unitOld.${key}' is not the right value`,
                                    this.id,
                                    `.asset.unitOld.${key}`,
                                    value,
                                    contract.asset.unit[key],
                                ),
                            );
                        }
                    });
                }

                // @ts-ignore
                const updatedContract = {
                    ...contract,
                    asset: {
                        ...contract.asset,
                        state: contract.asset.senderPublicKey === this.senderPublicKey ? STATES.RECIPIENT_REVIEW : STATES.SENDER_REVIEW,
                        rev: contract.asset.rev + 1,
                        unit: {
                            ...contract.asset.unit,
                            ...this.asset.unit,
                        },
                    },
                } as AccountJSON;

                store.account.set(contract.address, new Account(updatedContract));
            }
        }

        return errors;
    }

    protected async undoAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
        const contract = await store.account.getOrDefault(getContractAddress(this.asset.contractPublicKey)) as ContractInterface;
        if (this.asset.accept) {
            // @ts-ignore
            store.account.set(contract.address, new Account({
                ...contract,
                asset: {
                    ...contract.asset,
                    state: contract.asset.senderPublicKey === this.senderPublicKey ? STATES.SENDER_REVIEW : STATES.RECIPIENT_REVIEW,
                },
            }));
        } else if (!this.asset.accept) {
            // @ts-ignore
            const updatedContract = {
                ...contract,
                asset: {
                    ...contract.asset,
                    rev: contract.asset.rev - 1,
                    state: contract.asset.senderPublicKey === this.senderPublicKey ? STATES.SENDER_REVIEW : STATES.RECIPIENT_REVIEW,
                    unit: {
                        ...contract.asset.unit,
                        ...this.asset.unitOld,
                    }
                },
            } as AccountJSON;
            store.account.set(updatedContract.address, new Account(updatedContract));
        }
        return [];
    }
}
