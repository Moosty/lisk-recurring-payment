export declare const CreateContractAssetSchema: {
    type: string;
    required: string[];
    properties: {
        contractPublicKey: {
            type: string;
            format: string;
        };
        title: {
            type: string;
            pattern: string;
            maxLength: number;
        };
        unit: {
            type: string;
            required: string[];
            properties: {
                type: {
                    type: string;
                    enum: string[];
                };
                typeAmount: {
                    type: string;
                    minimum: number;
                };
                amount: {
                    type: string;
                    format: string;
                };
                prepaid: {
                    type: string;
                    minimum: number;
                };
                total: {
                    type: string;
                    minimum: number;
                };
                terminateFee: {
                    type: string;
                    minimum: number;
                };
            };
        };
        recipientPublicKey: {
            type: string;
            format: string;
        };
        senderPublicKey: {
            type: string;
            format: string;
        };
        timestamp: {
            type: string;
            minimum: number;
        };
        data: {
            type: string;
            format: string;
            maxLength: number;
        };
    };
};
export declare const ReviewContractAssetSchema: {
    type: string;
    required: string[];
    properties: {
        contractPublicKey: {
            type: string;
            format: string;
        };
        accept: {
            type: string;
        };
        unit: {
            type: string;
            properties: {
                type: {
                    type: string;
                    enum: string[];
                };
                typeAmount: {
                    type: string;
                    minimum: number;
                };
                amount: {
                    type: string;
                    format: string;
                };
                prepaid: {
                    type: string;
                    minimum: number;
                };
                total: {
                    type: string;
                    minimum: number;
                };
                terminateFee: {
                    type: string;
                    minimum: number;
                };
            };
        };
        unitOld: {
            type: string;
            properties: {
                type: {
                    type: string;
                    enum: string[];
                };
                typeAmount: {
                    type: string;
                    minimum: number;
                };
                amount: {
                    type: string;
                    format: string;
                };
                prepaid: {
                    type: string;
                    minimum: number;
                };
                total: {
                    type: string;
                    minimum: number;
                };
                terminateFee: {
                    type: string;
                    minimum: number;
                };
            };
        };
        data: {
            type: string;
            format: string;
            maxLength: number;
        };
    };
};
export declare const RequestPaymentAssetSchema: {
    type: string;
    required: string[];
    properties: {
        contractPublicKey: {
            type: string;
            format: string;
        };
        unit: {
            type: string;
            minimum: number;
        };
        data: {
            type: string;
            format: string;
            maxLength: number;
        };
    };
};
export declare const FundAssetSchema: {
    type: string;
    required: string[];
    properties: {
        contractPublicKey: {
            type: string;
            format: string;
        };
        units: {
            type: string;
            minimum: number;
        };
        data: {
            type: string;
            format: string;
            maxLength: number;
        };
    };
};
export declare const TerminateContractAssetSchema: {
    type: string;
    required: string[];
    properties: {
        contractPublicKey: {
            type: string;
            format: string;
        };
        peerPublicKey: {
            type: string;
            format: string;
        };
        unit: {
            type: string;
            minimum: number;
        };
        data: {
            type: string;
            format: string;
            maxLength: number;
        };
    };
};
