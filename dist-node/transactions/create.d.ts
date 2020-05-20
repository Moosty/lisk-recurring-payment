/// <reference types="node" />
import { BaseTransaction, StateStore, StateStorePrepare, TransactionError } from '@liskhq/lisk-transactions';
import { CreateAssetJSON } from '../interfaces';
export declare class CreateContract extends BaseTransaction {
    readonly asset: CreateAssetJSON;
    static TYPE: number;
    constructor(rawTransaction: unknown);
    getContractPublicKey(): string;
    getContractId(): string;
    protected assetToBytes(): Buffer;
    prepare(store: StateStorePrepare): Promise<void>;
    assetToJSON(): object;
    protected validateAsset(): ReadonlyArray<TransactionError>;
    protected applyAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>>;
    protected undoAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>>;
}
