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
import {FundAssetSchema} from '../schemas';
import {FundAssetJSON, FundTransactionJSON, ContractInterface} from '../interfaces';
import {getContractAddress} from "../utils";

export class FundContract extends BaseTransaction {
    readonly asset: FundAssetJSON;
    public static TYPE = 13030;

    public constructor(rawTransaction: unknown) {
        super(rawTransaction);
        const tx = (typeof rawTransaction === 'object' && rawTransaction !== null
            ? rawTransaction
            : {}) as Partial<FundTransactionJSON>;

        if (tx.asset) {
            this.asset = {
                ...tx.asset,
            } as FundAssetJSON;
        } else {
            this.asset = {} as FundAssetJSON;
        }
    }

    protected assetToBytes(): Buffer {
        const unitsBuffer = intToBuffer(
            this.asset.units, 2
        );

        const contractPublicKeyBuffer = this.asset.contractPublicKey
            ? stringToBuffer(this.asset.contractPublicKey)
            : Buffer.alloc(0);

        const dataBuffer = this.asset.data
            ? stringToBuffer(this.asset.data)
            : Buffer.alloc(0);

        return Buffer.concat([
            contractPublicKeyBuffer,
            unitsBuffer,
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
        const schemaErrors = validator.validate(FundAssetSchema, asset);
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

            if (contract.asset.senderPublicKey !== this.senderPublicKey) {
                errors.push(
                    new TransactionError(
                        'Sender is not sender in this contract',
                        this.id,
                        '.senderPublicKey',
                        this.senderPublicKey,
                        contract.asset.senderPublicKey
                    ),
                );
            }

            if (contract.asset.state !== STATES.ACTIVE && contract.asset.state !== STATES.ACCEPTED) {
                errors.push(
                    new TransactionError(
                        'Recurring payment contract is not accepted nor active',
                        this.id,
                        '.state',
                        contract.asset.state,
                        `${STATES.ACTIVE} | ${STATES.ACCEPTED}`
                    ),
                );
            }

            if (contract.asset.state === STATES.ACCEPTED && contract.asset.unit.prepaid > 0 && this.asset.units < contract.asset.unit.prepaid) {
                errors.push(
                    new TransactionError(
                        'There is a prepaid minimum',
                        this.id,
                        '.asset.units',
                        this.asset.units,
                        `> ${contract.asset.unit.prepaid}`
                    ),
                );
            }

            if (contract.asset.unit.total - contract.asset.payments < this.asset.units) {
                errors.push(
                    new TransactionError(
                        'Too many `.asset.units` for this contract',
                        this.id,
                        '.asset.units',
                        this.asset.units,
                        `< ${contract.asset.unit.total - contract.asset.payments}`
                    ),
                );
            }

            if (sender.balance < (BigInt(contract.asset.unit.amount) * BigInt(this.asset.units))) {
                errors.push(
                    new TransactionError(
                        'Senders balance is too low',
                        this.id,
                        '.balance',
                        sender.balance.toString(),
                        `>= ${(BigInt(contract.asset.unit.amount) * BigInt(this.asset.units)).toString()}`
                    ),
                );
            }

            contract.balance += BigInt(contract.asset.unit.amount) * BigInt(this.asset.units);
            const updatedContract: ContractInterface = {
                ...contract,
                asset: {
                    ...contract.asset,
                    state: STATES.ACTIVE,
                    start: contract.asset.state === STATES.ACCEPTED ? store.chain.lastBlockHeader.timestamp : contract.asset.start,
                },
            };
            store.account.set(updatedContract.address, updatedContract);

            sender.balance -= BigInt(contract.asset.unit.amount) * BigInt(this.asset.units);
            store.account.set(this.senderId, sender);
        }
        return errors;
    }

    protected async undoAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>> {
        const sender = await store.account.get(this.senderId);
        const contract = await store.account.getOrDefault(getContractAddress(this.asset.contractPublicKey)) as ContractInterface;
        contract.balance -= BigInt(contract.asset.unit.amount) * BigInt(this.asset.units);

        const updatedContract = {
            ...contract,
            asset: {
                ...contract.asset,
                state: contract.balance > BigInt(contract.asset.unit.prepaid || 1) * BigInt(contract.asset.unit.amount) || contract.asset.payments > 0 ? STATES.ACTIVE : STATES.ACCEPTED,
            },
        };
        store.account.set(updatedContract.address, updatedContract);

        sender.balance += BigInt(contract.asset.unit.amount) * BigInt(this.asset.units);
        store.account.set(this.senderId, sender);
        return [];
    }
}
