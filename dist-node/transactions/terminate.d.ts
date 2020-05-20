/// <reference types="node" />
import { BaseTransaction, StateStore, StateStorePrepare, TransactionError } from '@liskhq/lisk-transactions';
import { TerminateAssetJSON } from '../interfaces';
export declare class TerminateContract extends BaseTransaction {
    readonly asset: TerminateAssetJSON;
    static TYPE: number;
    constructor(rawTransaction: unknown);
    protected assetToBytes(): Buffer;
    prepare(store: StateStorePrepare): Promise<void>;
    assetToJSON(): object;
    protected validateAsset(): ReadonlyArray<TransactionError>;
    protected applyAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>>;
    protected undoAsset(store: StateStore): Promise<ReadonlyArray<TransactionError>>;
}
