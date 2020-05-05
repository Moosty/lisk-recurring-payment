import {Account, TransactionError} from '@liskhq/lisk-transactions/dist-node';
import {
    ReviewContract,
} from '../../src/transactions';
import {
    ReviewContractTransaction,
} from '../../src';
import {
    transactions,
    accounts,
} from '../fixtures';
import {defaultAccount, defaultNetworkIdentifier, StateStoreMock} from '../helpers/state_store';
import {ReviewAssetJSON} from '../../src/interfaces';
import {getContractAddress} from '../../src/utils';
import {PAYMENT_TYPE, STATES} from "../../src/constants";

describe('Test Review Transaction', () => {
    const validReviewTransaction = transactions.validReviewTransaction.input as Partial<ReviewAssetJSON>;
    let validTestTransaction: ReviewContract;
    let sender: Account;
    let recipient: Account;
    let contract: Account;
    let store: StateStoreMock;

    beforeEach(() => {
        validTestTransaction = new ReviewContractTransaction(
            validReviewTransaction,
        );
        sender = {
            ...defaultAccount,
            balance: BigInt('10000000000'),
            address: accounts.defaultAccount.senderId,
        };

        recipient = {
            ...defaultAccount,
            balance: BigInt('10000000000'),
            address: accounts.secondAccount.senderId,
        };

        contract = {
            ...defaultAccount,
            address: "15435023355030673670L",
            asset: {
                type: PAYMENT_TYPE,
                state: STATES.SENDER_REVIEW,
                unit: {
                    type: "HOURS",
                    typeAmount: 1,
                    amount: "100000000",
                    prepaid: 1,
                    total: 12,
                    terminateFee: 0,
                },
                recipientPublicKey: "5c554d43301786aec29a09b13b485176e81d1532347a351aeafe018c199fd7ca",
                senderPublicKey: "bfdd0ed3914d6e1a3e9a039b6bdfda2b77f727cb708354c3d80d0ea945a8749a",
                rev: 0,
                payments: 0,
            }
        }

        store = new StateStoreMock([sender, recipient, contract]);

        jest.spyOn(store.account, 'cache');
        jest.spyOn(store.account, 'get');
        jest.spyOn(store.account, 'getOrDefault');
        jest.spyOn(store.account, 'set');
    });

    describe('#constructor', () => {
        it('should create instance of ReviewContract', async () => {
            expect(validTestTransaction).toBeInstanceOf(ReviewContract);
        });

        it('should create empty instance of CreateContract', async () => {
            validTestTransaction = new ReviewContractTransaction({});
            expect(validTestTransaction).toBeInstanceOf(ReviewContract);
            expect(validTestTransaction.asset.unit).toEqual(
                undefined,
            );
        });

        it('should set asset data', async () => {
            expect(validTestTransaction.asset.data).toEqual(
                transactions.validReviewTransaction.input.asset.data,
            );
        });

        it('should set asset contractPublicKey', async () => {
            expect(validTestTransaction.asset).toEqual(
                transactions.validReviewTransaction.input.asset,
            );
        });

        it('should set asset unitOld', async () => {
            expect(validTestTransaction.asset.unitOld).toEqual(
                transactions.validReviewTransaction.input.asset.unitOld,
            );
        });

        it('should set asset unit', async () => {
            expect(validTestTransaction.asset.unit).toEqual(
                transactions.validReviewTransaction.input.asset.unit,
            );
        });
    });

    describe('#assetToJSON', () => {
        it('should return an object of type review asset', async () => {
            const assetJson = validTestTransaction.assetToJSON() as any;
            expect(assetJson).toEqual(transactions.validReviewTransaction.input.asset);
        });

        it('should return an accept object of type review asset', async () => {
            validTestTransaction = new ReviewContractTransaction(
                {
                    ...validReviewTransaction,
                    asset: {
                        contractPublicKey: validTestTransaction.asset.contractPublicKey,
                        accept: true
                    },
                }
            );
            const assetJson = validTestTransaction.assetToJSON() as any;
            expect(assetJson).toEqual({
                accept: true,
                "contractPublicKey": "38a3ae5bef78e7923d7065eaae74727eb84fd5593c474d438271329b6a71f8c7"
            });
        });
    });

    describe('#assetToBytes', () => {
        it('should return an accept object of type review asset', async () => {
            validTestTransaction = new ReviewContractTransaction(
                {
                    ...validReviewTransaction,
                    asset: {
                        contractPublicKey: validTestTransaction.asset.contractPublicKey,
                        accept: true
                    },
                }
            );
            // @ts-ignore
            const assetBytes = validTestTransaction.assetToBytes() as any;
            expect(assetBytes.toString()).toEqual("38a3ae5bef78e7923d7065eaae74727eb84fd5593c474d438271329b6a71f8c7");
        });
    })

    describe('#validateAssets', () => {

        it('should return no errors', async () => {
            validTestTransaction = new ReviewContractTransaction(
                {
                    ...validReviewTransaction,
                    asset: {
                        ...validTestTransaction.asset,
                        accept: false
                    },
                }
            );
            const errors = (validTestTransaction as any).validateAsset();
            expect(errors.length).toEqual(0);
        });

        it('should return accept error', async () => {
            const errors = (validTestTransaction as any).validateAsset();
            expect(errors.length).toEqual(1);
            expect(errors[0].message).toEqual("'.asset' should have required property 'accept'");
        });

        it('should return no units allowed error', async () => {
            validTestTransaction = new ReviewContractTransaction(
                {
                    ...validReviewTransaction,
                    asset: {
                        ...validTestTransaction.asset,
                        accept: true
                    },
                }
            );
            const errors = (validTestTransaction as any).validateAsset();
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                'When `.asset.accept === true`, `.asset.unit` and `.asset.unitOld` are not allowed.',
            );
        });

        it('should return no errors', async () => {
            validTestTransaction = new ReviewContractTransaction(
                {
                    ...validReviewTransaction,
                    asset: {
                        ...validTestTransaction.asset,
                        accept: false,
                        unit: {
                            amount: "30",
                            type: "YEARS",
                        },
                        unitOld: {
                            type: "MONTHS"
                        }
                    },
                }
            );
            const errors = (validTestTransaction as any).validateAsset();
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                '`.asset.unit` and `.asset.unitOld` should have the same keys.',
            );
        });

        it('should return missing unitOld asset error', async () => {
            validTestTransaction = new ReviewContractTransaction(
                {
                    ...validReviewTransaction,
                    asset: {
                        contractPublicKey: validTestTransaction.asset.contractPublicKey,
                        accept: false,
                        unit: validTestTransaction.asset.unit,
                    },
                }
            );
            const errors = (validTestTransaction as any).validateAsset();
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                'Missing `.asset.unitOld`.',
            );
        });

        it('should return missing unitOld asset error', async () => {
            validTestTransaction = new ReviewContractTransaction(
                {
                    ...validReviewTransaction,
                    asset: {
                        contractPublicKey: validTestTransaction.asset.contractPublicKey,
                        accept: false,
                        unitOld: validTestTransaction.asset.unitOld,
                    },
                }
            );
            const errors = (validTestTransaction as any).validateAsset();
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                'Missing `.asset.unit`.',
            );
        });

    });

    describe('#prepare', () => {
        it('should call state store', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validReviewTransaction.passphrase);
            await validTestTransaction.prepare(store);
            expect(store.account.cache).toHaveBeenCalledWith([
                {address: transactions.validReviewTransaction.senderId},
                {address: getContractAddress(transactions.validReviewTransaction.input.asset.contractPublicKey)},
            ]);
        });
    });

    describe('#applyAsset', () => {
        it('should return no errors', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validReviewTransaction.passphrase);
            const errors = (validTestTransaction as any).applyAsset(store);
            expect(Object.keys(errors)).toHaveLength(0);
        });

        it('should return not a contract errors', async () => {
            validTestTransaction = new ReviewContractTransaction(
                {
                    ...validReviewTransaction,
                    asset: {
                        ...validTestTransaction.asset,
                        contractPublicKey: accounts.defaultAccount.senderPublicKey,
                    },
                }
            );
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validReviewTransaction.passphrase);
            const errors = await (validTestTransaction as any).applyAsset(store);
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                '`contractPublicKey` not a recurring payment contract.',
            );
        });

        it('should return not a contract errors', async () => {
            validTestTransaction = new ReviewContractTransaction(
                {
                    ...validReviewTransaction,
                    asset: {
                        ...validTestTransaction.asset,
                        contractPublicKey: accounts.defaultAccount.senderPublicKey,
                    },
                }
            );
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validReviewTransaction.passphrase);
            const errors = await (validTestTransaction as any).applyAsset(store);
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                '`contractPublicKey` not a recurring payment contract.',
            );
        });
        it('should return not return errors accept review', async () => {
            validTestTransaction = new ReviewContractTransaction(
                {
                    ...validReviewTransaction,
                    asset: {
                        contractPublicKey: transactions.validReviewTransaction.input.asset.contractPublicKey,
                        accept: true,
                    },
                }
            );
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validReviewTransaction.passphrase);
            const errors = await (validTestTransaction as any).applyAsset(store);
            expect(errors.length).toEqual(0);
        });

        it('should return wrong state error', async () => {
            validTestTransaction = new ReviewContractTransaction(
                {
                    ...validReviewTransaction,
                    asset: {
                        contractPublicKey: transactions.validReviewTransaction.input.asset.contractPublicKey,
                        accept: true,
                    },
                }
            );
            store = new StateStoreMock([sender, recipient, {
                ...contract,
                asset: {
                    ...contract.asset,
                    state: STATES.ACTIVE,
                }
            }]);
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validRequestTransaction.passphrase);
            const errors = await (validTestTransaction as any).applyAsset(store);
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                'Contract is not in review state.',
            );
        });

        it('should return wrong recipientId error', async () => {
            validTestTransaction = new ReviewContractTransaction(
                {
                    ...validReviewTransaction,
                    asset: {
                        ...validTestTransaction.asset,
                        unitOld: {
                            // @ts-ignore
                            ...contract.asset.unit,
                        },
                        unit: {
                            // @ts-ignore
                            ...contract.asset.unit,
                        },
                    },
                }
            );
            store = new StateStoreMock([sender, recipient, {
                ...contract,
                asset: {
                    ...contract.asset,
                    state: STATES.SENDER_REVIEW,
                }
            }]);
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validRequestTransaction.passphraseWrong);
            const errors = await (validTestTransaction as any).applyAsset(store);
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                'Sender is not participant in contract',
            );
        });

        it('should return wrong reviewer errors', async () => {
            validTestTransaction = new ReviewContractTransaction(
                {
                    ...validReviewTransaction,
                    asset: {
                        ...validTestTransaction.asset,
                        unitOld: {
                            // @ts-ignore
                            ...contract.asset.unit,
                        },
                        unit: {
                            // @ts-ignore
                            ...contract.asset.unit,
                        },
                    },
                }
            );
            store = new StateStoreMock([sender, recipient, {
                ...contract,
                asset: {
                    ...contract.asset,
                    state: STATES.SENDER_REVIEW,
                }
            }]);
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validReviewTransaction.passphraseWrong);
            const errors = await (validTestTransaction as any).applyAsset(store);
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                'The other party needs to review the contract',
            );
        });

        it('should call state store', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validReviewTransaction.passphrase);
            await (validTestTransaction as any).applyAsset(store);
            expect(store.account.getOrDefault).toHaveBeenCalledWith(
                transactions.validReviewTransaction.contractId,
            );
            expect(store.account.set).toHaveBeenCalledWith(
                transactions.validReviewTransaction.contractId,
                expect.objectContaining({
                    address: transactions.validReviewTransaction.contractId,
                }),
            );

        });
    });

    describe('#undoAsset', () => {
        it('should call state store', async () => {
            validTestTransaction = new ReviewContractTransaction(
                {
                    ...validReviewTransaction,
                    asset: {
                        ...validTestTransaction.asset,
                        accept: false
                    },
                }
            );
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validReviewTransaction.passphrase);
            await (validTestTransaction as any).undoAsset(store);
            expect(store.account.getOrDefault).toHaveBeenCalledWith(
                "15435023355030673670L");
            expect(store.account.set).toHaveBeenCalledWith(
                "15435023355030673670L",
                expect.objectContaining({
                    publicKey: undefined,
                }));
            expect(store.accountData[2]).toMatchObject({
                publicKey: undefined,
                asset: {
                    type: 'RECURRING_PAYMENT_CONTRACT',
                    state: 'SENDER_REVIEW',
                    unit: {
                        type: "MINUTES",
                        typeAmount: 1,
                        amount: "100000",
                        prepaid: 10,
                        total: 100,
                        terminateFee: 5,
                    },
                    recipientPublicKey: '5c554d43301786aec29a09b13b485176e81d1532347a351aeafe018c199fd7ca',
                    senderPublicKey: 'bfdd0ed3914d6e1a3e9a039b6bdfda2b77f727cb708354c3d80d0ea945a8749a',
                    rev: -1,
                    payments: 0
                }
            });
        });
    });
});
