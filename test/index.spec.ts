import 'jest-extended';
import {
    UnConfiguredCreateTransaction,
    UnConfiguredRequestTransaction,
    UnConfiguredReviewTransaction,
    UnConfiguredTerminateTransaction,
    UnConfiguredFundTransaction,
    CreateContractTransaction,
    ReviewContractTransaction,
    RequestPaymentTransaction,
    TerminateContractTransaction,
    FundContractTransaction,
} from "../src";

describe('Test index', () => {

    it('should return UnConfiguredCreateTransaction', () => {
        return expect(UnConfiguredCreateTransaction).toBeFunction();
    });

    it('should return UnConfiguredRequestTransaction', () => {
        return expect(UnConfiguredRequestTransaction).toBeFunction();
    });

    it('should return UnConfiguredReviewTransaction', () => {
        return expect(UnConfiguredReviewTransaction).toBeFunction();
    });

    it('should return UnConfiguredTerminateTransaction', () => {
        return expect(UnConfiguredTerminateTransaction).toBeFunction();
    });

    it('should return UnConfiguredFundTransaction', () => {
        return expect(UnConfiguredFundTransaction).toBeFunction();
    });

    it('should return CreateContractTransaction', () => {
        return expect(CreateContractTransaction).toBeFunction();
    });

    it('should return ReviewContractTransaction', () => {
        return expect(ReviewContractTransaction).toBeFunction();
    });

    it('should return RequestPaymentTransaction', () => {
        return expect(RequestPaymentTransaction).toBeFunction();
    });

    it('should return TerminateContractTransaction', () => {
        return expect(TerminateContractTransaction).toBeFunction();
    });

    it('should return FundContractTransaction', () => {
        return expect(FundContractTransaction).toBeFunction();
    });

});
