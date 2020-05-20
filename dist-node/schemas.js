"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateContractAssetSchema = {
    type: 'object',
    required: ['unit', 'title', 'recipientPublicKey', 'senderPublicKey', 'timestamp'],
    properties: {
        contractPublicKey: {
            type: 'string',
            format: 'publicKey',
        },
        title: {
            type: 'string',
            pattern: '[a-zA-Z0-9_-]{3,20}',
            maxLength: 20,
        },
        unit: {
            type: 'object',
            required: ['type', 'typeAmount', 'amount', 'prepaid', 'total', 'terminateFee'],
            properties: {
                type: {
                    type: 'string',
                    enum: ['MINUTES', 'HOURS', 'DAYS', 'MONTHS', 'YEARS'],
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
        timestamp: {
            type: 'integer',
            minimum: 1,
        },
        data: {
            type: 'string',
            format: 'transferData',
            maxLength: 64,
        },
    },
};
exports.ReviewContractAssetSchema = {
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
        unit: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['MINUTES', 'HOURS', 'DAYS', 'MONTHS', 'YEARS'],
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
        unitOld: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['MINUTES', 'HOURS', 'DAYS', 'MONTHS', 'YEARS'],
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
exports.RequestPaymentAssetSchema = {
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
exports.FundAssetSchema = {
    type: 'object',
    required: ['contractPublicKey', 'units'],
    properties: {
        contractPublicKey: {
            type: 'string',
            format: 'publicKey',
        },
        units: {
            type: 'integer',
            minimum: 1,
        },
        data: {
            type: 'string',
            format: 'transferData',
            maxLength: 64,
        },
    },
};
exports.TerminateContractAssetSchema = {
    type: 'object',
    required: ['contractPublicKey', 'peerPublicKey'],
    properties: {
        contractPublicKey: {
            type: 'string',
            format: 'publicKey',
        },
        peerPublicKey: {
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
//# sourceMappingURL=schemas.js.map