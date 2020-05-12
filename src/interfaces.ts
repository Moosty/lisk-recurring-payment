import { Account } from "@liskhq/lisk-transactions";

export interface ContractInterface extends Account{
    readonly asset: ContractAsset;
}

export interface ContractAsset {
    readonly type: string;
    readonly title: string;
    readonly state: string;
    readonly unit: UnitAsset;
    readonly recipientPublicKey: string;
    readonly senderPublicKey: string;
    readonly rev: number;
    readonly start?: number;
    readonly payments: number;
    readonly lastBalance: string;
}

export interface TransactionJSON {
    readonly id?: string;
    readonly blockId?: string;
    readonly height?: number;
    readonly confirmations?: number;
    readonly senderPublicKey: string;
    readonly signatures?: ReadonlyArray<string>;
    readonly type: number;
    readonly receivedAt?: string;
    readonly networkIdentifier?: string;
    readonly nonce: string;
    readonly fee: string;
}

export interface UnitAsset {
    readonly type: string;
    readonly typeAmount: number;
    readonly amount: string;
    readonly prepaid: number;
    readonly total: number;
    readonly terminateFee: number;
}

export interface CreateAssetJSON {
    readonly contractPublicKey?: string;
    readonly title: string;
    readonly unit: UnitAsset;
    readonly recipientPublicKey: string;
    readonly senderPublicKey: string;
    readonly timestamp: number;
    readonly data?: string;
}

export interface ReviewAssetJSON {
    readonly contractPublicKey: string;
    readonly accept: boolean;
    readonly unit?: Partial<UnitAsset>;
    readonly unitOld?: Partial<UnitAsset>;
    readonly data?: string;
}

export interface FundAssetJSON {
    readonly contractPublicKey: string;
    readonly units: number;
    readonly data?: string;
}

export interface RequestAssetJSON {
    readonly contractPublicKey: string;
    readonly unit: number;
    readonly data?: string;
}

export interface TerminateAssetJSON {
    readonly contractPublicKey: string;
    readonly peerPublicKey: string;
    readonly unit: number;
    readonly data?: string;
}

export interface CreateTransactionJSON extends TransactionJSON{
    readonly asset: CreateAssetJSON;
}

export interface ReviewTransactionJSON extends TransactionJSON{
    readonly asset: ReviewAssetJSON;
}

export interface RequestTransactionJSON extends TransactionJSON{
    readonly asset: RequestAssetJSON;
}

export interface FundTransactionJSON extends TransactionJSON{
    readonly asset: FundAssetJSON;
}

export interface TerminateTransactionJSON extends TransactionJSON{
    readonly asset: TerminateAssetJSON;
}

export interface CreateContractConfig {
    fee?: string;
}

export interface ReviewContractConfig {
    fee?: string;
}

export interface RequestPaymentConfig {
    fee?: string;
}

export interface TerminateContractConfig {
    fee?: string;
}
