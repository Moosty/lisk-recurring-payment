export const EPOCH_TIME = new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0));
export const EPOCH_TIME_MILLISECONDS = EPOCH_TIME.getTime();
export const MS_FACTOR = 1000;
export const EPOCH_TIME_SECONDS = Math.floor(EPOCH_TIME.getTime() / MS_FACTOR);
export const FIXED_POINT = 10 ** 8;
export const MIN_FEE_PER_BYTE = 1000;
export const CREATE_FEE = FIXED_POINT * .5;
export const REVIEW_FEE = FIXED_POINT * .5;
export const REQUEST_FEE = FIXED_POINT * .01;
export const TERMINATE_FEE = 0;
export const PAYMENT_TYPE = "RECURRING_PAYMENT_CONTRACT";
export const STATES = {
    RECIPIENT_REVIEW: 'RECIPIENT_REVIEW',
    SENDER_REVIEW: 'SENDER_REVIEW',
    ACCEPTED: 'ACCEPTED',
    TERMINATED_SENDER: 'TERMINATED_SENDER',
    TERMINATED_RECIPIENT: 'TERMINATED_RECIPIENT',
    ENDED: 'ENDED',
    ACTIVE: 'ACTIVE',
};

export const TYPES = [
    'MINUTES',
    'HOURS',
    'DAYS',
    'MONTHS',
    'YEARS',
];
