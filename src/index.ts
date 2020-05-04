import {
    CreateContract as CreateContractUnConfiguredTransaction,
    ReviewContract as ReviewContractUnConfiguredTransaction,
    RequestPayment as RequestPaymentUnConfiguredTransaction,
    TerminateContract as TerminateContractUnConfiguredTransaction,
    FundContract as FundContractUnConfiguredTransaction,
} from './transactions';
import * as utils  from './utils';

const configureCreateTransaction = (): any => {
    return class CreateContractTransaction extends CreateContractUnConfiguredTransaction {
        constructor(props) {
            super(props);
        }
    }
};
const configureReviewTransaction = (): any => {
    return class ReviewContractTransaction extends ReviewContractUnConfiguredTransaction {
        constructor(props) {
            super(props);
        }
    }
};

const configureRequestTransaction = (): any => {
    return class RequestPaymentTransaction extends RequestPaymentUnConfiguredTransaction {
        constructor(props) {
            super(props);
        }
    }
};

const configureTerminateTransaction = (): any => {
    return class TerminateContractTransaction extends TerminateContractUnConfiguredTransaction {
        constructor(props) {
            super(props);
        }
    }
};

const configureFundTransaction = (): any => {
    return class FundContractTransaction extends FundContractUnConfiguredTransaction {
        constructor(props) {
            super(props);
        }
    }
};

const CreateContractTransaction = configureCreateTransaction();
const ReviewContractTransaction = configureReviewTransaction();
const RequestPaymentTransaction = configureRequestTransaction();
const TerminateContractTransaction = configureTerminateTransaction();
const FundContractTransaction = configureFundTransaction();

export {
    CreateContractTransaction,
    ReviewContractTransaction,
    RequestPaymentTransaction,
    TerminateContractTransaction,
    FundContractTransaction,
    configureCreateTransaction as UnConfiguredCreateTransaction,
    configureReviewTransaction as UnConfiguredReviewTransaction,
    configureRequestTransaction as UnConfiguredRequestTransaction,
    configureTerminateTransaction as UnConfiguredTerminateTransaction,
    configureFundTransaction as UnConfiguredFundTransaction,
    utils,
};
