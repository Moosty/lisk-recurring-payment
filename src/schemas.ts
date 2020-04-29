
export const CreateContractAssetSchema = {
    type: 'object',
    required: ['contractPublicKey', 'unit', 'recipientPublicKey', 'senderPublicKey'],
    properties: {
        contractPublicKey: {
            type: 'string',
            format: 'publicKey',
        },
        unit: {
            type: 'object',
            required: ['type', 'typeAmount', 'amount', 'prepaid', 'total', 'terminateFee'],
            properties: {
                type: {
                    type: 'string',
                    enum: ['minutes', 'hours', 'days', 'months', 'years'],
                },
                typeAmount: {
                    type: 'integer',
                    minimum: 1,
                },
                amount: {
                    type: 'string',
                    format: 'int64',
                },
                prepaid: {
                    type: 'integer',
                    minimum: 1,
                },
                total: {
                    type: 'integer',
                    minimum: 0,
                },
                terminateFee: {
                    type: 'integer',
                    minimum: 0,
                },
            },
        },
        recipientPublicKey: {
            type: 'string',
            format: 'publicKey',
        },
        senderPublicKey: {
            type: 'string',
            format: 'publicKey',
        },
        data: {
            type: 'string',
            format: 'transferData',
            maxLength: 64,
        },
    },
};

export const ReviewContractAssetSchema = {
    type: 'object',
    required: ['contractPublicKey', 'accept'],
    properties: {
        contractPublicKey: {
            type: 'string',
            format: 'publicKey',
        },
        accept: {
            type: 'boolean',
        },
        revision: {
            type: 'integer',
            minimum: 1,
        },
        unit: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['minutes', 'hours', 'days', 'months', 'years'],
                },
                typeAmount: {
                    type: 'integer',
                    minimum: 1,
                },
                amount: {
                    type: 'string',
                    format: 'int64',
                },
                prepaid: {
                    type: 'integer',
                    minimum: 1,
                },
                total: {
                    type: 'integer',
                    minimum: 0,
                },
                terminateFee: {
                    type: 'integer',
                    minimum: 0,
                },
            },
        },
        data: {
            type: 'string',
            format: 'transferData',
            maxLength: 64,
        },
    },
};

export const RequestPaymentAssetSchema = {
    type: 'object',
    required: ['contractPublicKey', 'unit'],
    properties: {
        contractPublicKey: {
            type: 'string',
            format: 'publicKey',
        },
        unit: {
            type: 'integer',
            minimum: 0,
        },
        data: {
            type: 'string',
            format: 'transferData',
            maxLength: 64,
        },
    },
};


export const TerminateContractAssetSchema = {
    type: 'object',
    required: ['contractPublicKey'],
    properties: {
        contractPublicKey: {
            type: 'string',
            format: 'publicKey',
        },
        data: {
            type: 'string',
            format: 'transferData',
            maxLength: 64,
        },
    },
};
