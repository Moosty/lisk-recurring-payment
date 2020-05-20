"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EPOCH_TIME = new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0));
exports.EPOCH_TIME_MILLISECONDS = exports.EPOCH_TIME.getTime();
exports.MS_FACTOR = 1000;
exports.EPOCH_TIME_SECONDS = Math.floor(exports.EPOCH_TIME.getTime() / exports.MS_FACTOR);
exports.FIXED_POINT = 10 ** 8;
exports.MIN_FEE_PER_BYTE = 1000;
exports.CREATE_FEE = exports.FIXED_POINT * .5;
exports.REVIEW_FEE = exports.FIXED_POINT * .5;
exports.REQUEST_FEE = exports.FIXED_POINT * .01;
exports.TERMINATE_FEE = 0;
exports.PAYMENT_TYPE = "RECURRING_PAYMENT_CONTRACT";
exports.STATES = {
    RECIPIENT_REVIEW: 'RECIPIENT_REVIEW',
    SENDER_REVIEW: 'SENDER_REVIEW',
    ACCEPTED: 'ACCEPTED',
    TERMINATED_SENDER: 'TERMINATED_SENDER',
    TERMINATED_RECIPIENT: 'TERMINATED_RECIPIENT',
    ENDED: 'ENDED',
    ACTIVE: 'ACTIVE',
};
exports.TYPES = [
    'MINUTES',
    'HOURS',
    'DAYS',
    'MONTHS',
    'YEARS',
];
exports.slotTypes = {
    [exports.TYPES[0]]: 60,
    [exports.TYPES[1]]: 60 * 60,
    [exports.TYPES[2]]: 24 * 60 * 60,
    [exports.TYPES[3]]: 30.4 * 24 * 60 * 60,
    [exports.TYPES[4]]: 365 * 24 * 60 * 60,
};
//# sourceMappingURL=constants.js.map