export declare const EPOCH_TIME: Date;
export declare const EPOCH_TIME_MILLISECONDS: number;
export declare const MS_FACTOR = 1000;
export declare const EPOCH_TIME_SECONDS: number;
export declare const FIXED_POINT: number;
export declare const MIN_FEE_PER_BYTE = 1000;
export declare const CREATE_FEE: number;
export declare const REVIEW_FEE: number;
export declare const REQUEST_FEE: number;
export declare const TERMINATE_FEE = 0;
export declare const PAYMENT_TYPE = "RECURRING_PAYMENT_CONTRACT";
export declare const STATES: {
    RECIPIENT_REVIEW: string;
    SENDER_REVIEW: string;
    ACCEPTED: string;
    TERMINATED_SENDER: string;
    TERMINATED_RECIPIENT: string;
    ENDED: string;
    ACTIVE: string;
};
export declare const TYPES: string[];
export declare const slotTypes: {
    [x: string]: number;
};
