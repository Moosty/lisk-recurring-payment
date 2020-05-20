"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const transactions_1 = require("./transactions");
const utils = tslib_1.__importStar(require("./utils"));
exports.utils = utils;
const configureCreateTransaction = () => {
    return class CreateContractTransaction extends transactions_1.CreateContract {
        constructor(props) {
            super(props);
        }
    };
};
exports.UnConfiguredCreateTransaction = configureCreateTransaction;
const configureReviewTransaction = () => {
    return class ReviewContractTransaction extends transactions_1.ReviewContract {
        constructor(props) {
            super(props);
        }
    };
};
exports.UnConfiguredReviewTransaction = configureReviewTransaction;
const configureRequestTransaction = () => {
    return class RequestPaymentTransaction extends transactions_1.RequestPayment {
        constructor(props) {
            super(props);
        }
    };
};
exports.UnConfiguredRequestTransaction = configureRequestTransaction;
const configureTerminateTransaction = () => {
    return class TerminateContractTransaction extends transactions_1.TerminateContract {
        constructor(props) {
            super(props);
        }
    };
};
exports.UnConfiguredTerminateTransaction = configureTerminateTransaction;
const configureFundTransaction = () => {
    return class FundContractTransaction extends transactions_1.FundContract {
        constructor(props) {
            super(props);
        }
    };
};
exports.UnConfiguredFundTransaction = configureFundTransaction;
const CreateContractTransaction = configureCreateTransaction();
exports.CreateContractTransaction = CreateContractTransaction;
const ReviewContractTransaction = configureReviewTransaction();
exports.ReviewContractTransaction = ReviewContractTransaction;
const RequestPaymentTransaction = configureRequestTransaction();
exports.RequestPaymentTransaction = RequestPaymentTransaction;
const TerminateContractTransaction = configureTerminateTransaction();
exports.TerminateContractTransaction = TerminateContractTransaction;
const FundContractTransaction = configureFundTransaction();
exports.FundContractTransaction = FundContractTransaction;
//# sourceMappingURL=index.js.map