import {Account, TransactionError} from '@liskhq/lisk-transactions/dist-node';
import {
    RequestPayment,
} from '../../src/transactions';
import {
    RequestPaymentTransaction,
} from '../../src';
import {
    transactions,
    accounts,
} from '../fixtures';
import {defaultAccount, defaultNetworkIdentifier, StateStoreMock} from '../helpers/state_store';
import {ContractInterface, RequestAssetJSON} from '../../src/interfaces';
import {getContractAddress} from '../../src/utils';
import {PAYMENT_TYPE, STATES} from "../../src/constants";

describe('Test Request Transaction', () => {
    const validRequestTransaction = transactions.validRequestTransaction.input as Partial<RequestAssetJSON>;
    let validTestTransaction: RequestPayment;
    let sender: Account;
    let recipient: Account;
    let contract: ContractInterface;
    let store: StateStoreMock;

    beforeEach(() => {
        validTestTransaction = new RequestPaymentTransaction(
            validRequestTransaction,
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
            balance: BigInt("100000000000"),
            asset: {
                type: PAYMENT_TYPE,
                state: STATES.ACTIVE,
                title: "testTitle",
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
                lastBalance: '0',
            }
        }

        store = new StateStoreMock([sender, recipient, contract]);

        jest.spyOn(store.account, 'cache');
        jest.spyOn(store.account, 'get');
        jest.spyOn(store.account, 'getOrDefault');
        jest.spyOn(store.account, 'set');
    });

    describe('#constructor', () => {
        it('should create instance of RequestPayment', async () => {
            expect(validTestTransaction).toBeInstanceOf(RequestPayment);
        });

        it('should set asset data', async () => {
            expect(validTestTransaction.asset.data).toEqual(
                transactions.validRequestTransaction.input.asset.data,
            );
        });

        it('should set asset unit', async () => {
            expect(validTestTransaction.asset.unit).toEqual(
                transactions.validRequestTransaction.input.asset.unit,
            );
        });

        it('should set asset contractPublicKey', async () => {
            expect(validTestTransaction.asset.contractPublicKey).toEqual(
                transactions.validRequestTransaction.input.asset.contractPublicKey,
            );
        });

        it('should set asset unit', async () => {
            expect(validTestTransaction.asset.unit).toEqual(
                transactions.validRequestTransaction.input.asset.unit,
            );
        });

    });

    describe('#assetToJSON', () => {
        it('should return an object of type review asset', async () => {
            const assetJson = validTestTransaction.assetToJSON() as any;
            expect(assetJson).toEqual(transactions.validRequestTransaction.input.asset);
        });
    });

    describe('#validateAssets', () => {

        it('should return no errors', async () => {
            const errors = (validTestTransaction as any).validateAsset();
            expect(errors.length).toEqual(0);
        });

        it('should return unit error', async () => {
            validTestTransaction = new RequestPaymentTransaction(
                {
                    ...validRequestTransaction,
                    asset: {
                        contractPublicKey: validTestTransaction.asset.contractPublicKey,
                    },
                }
            );
            const errors = (validTestTransaction as any).validateAsset();
            expect(errors.length).toEqual(1);
            expect(errors[0].message).toEqual("'.asset' should have required property 'unit'");
        });
    });

    describe('#prepare', () => {
        it('should call state store', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validRequestTransaction.passphrase);
            await validTestTransaction.prepare(store);
            expect(store.account.cache).toHaveBeenCalledWith([
                {address: transactions.validRequestTransaction.senderId},
                {address: getContractAddress(transactions.validRequestTransaction.input.asset.contractPublicKey)},
            ]);
        });
    });

    describe('#applyAsset', () => {
        it('should return no errors', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validRequestTransaction.passphrase);
            const errors = (validTestTransaction as any).applyAsset(store);
            expect(Object.keys(errors)).toHaveLength(0);
        });

        it('should call state store', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validRequestTransaction.passphrase);
            await (validTestTransaction as any).applyAsset(store);
            expect(store.account.getOrDefault).toHaveBeenCalledWith(
                transactions.validRequestTransaction.contractId,
            );
            expect(store.account.getOrDefault).toHaveBeenCalledWith(
                transactions.validRequestTransaction.senderId,
            );
            expect(store.account.set).toHaveBeenCalledWith(
                transactions.validRequestTransaction.contractId,
                expect.objectContaining({
                    address: transactions.validRequestTransaction.contractId,
                    balance: contract.balance - BigInt(contract.asset.unit.amount),
                    asset: expect.objectContaining({
                        payments: 1,
                    })
                }),
            );
            expect(store.account.set).toHaveBeenCalledWith(
                transactions.validRequestTransaction.senderId,
                expect.objectContaining({
                    balance: sender.balance + BigInt(contract.asset.unit.amount),
                }),
            );
        });


        it('should return wrong unit error', async () => {
            validTestTransaction = new RequestPaymentTransaction(
                {
                    ...validRequestTransaction,
                    asset: {
                        ...validTestTransaction.asset,
                        unit: 10
                    },
                }
            );
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validRequestTransaction.passphrase);
            const errors = await (validTestTransaction as any).applyAsset(store);
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                'Wrong `.asset.unit` number given',
            );
        });

        it('should return low balance error', async () => {
            contract.balance = BigInt(0);
            store = new StateStoreMock([sender, recipient, contract]);

            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validRequestTransaction.passphrase);
            const errors = await (validTestTransaction as any).applyAsset(store);
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                'Contract balance is too low',
            );
        });

        it('should return wrong state error', async () => {
            contract = {
                ...contract,
                asset: {
                    ...contract.asset,
                    state: STATES.ACCEPTED,
                }
            }
            store = new StateStoreMock([sender, recipient, contract]);

            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validRequestTransaction.passphrase);
            const errors = await (validTestTransaction as any).applyAsset(store);
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                'Recurring payment contract is not active',
            );
        });

        it('should return not a contract error', async () => {
            validTestTransaction = new RequestPaymentTransaction(
                {
                    ...validRequestTransaction,
                    asset: {
                        ...validTestTransaction.asset,
                        contractPublicKey: "bfdd0ed3914d6e1a3e9a039b6bdfda2b77f727cb708354c3d80d0ea945a8749a"
                    },
                }
            );
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validRequestTransaction.passphrase);
            const errors = await (validTestTransaction as any).applyAsset(store);
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                '`contractPublicKey` not a recurring payment contract.',
            );
        });

        it('should return wrong recipientId error', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validRequestTransaction.passphraseWrong);
            const errors = await (validTestTransaction as any).applyAsset(store);
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                'Sender is not recipient in this contract',
            );
        });
    });

    describe('#undoAsset', () => {
        it('should call state store', async () => {
            validTestTransaction = new RequestPaymentTransaction(
                {
                    ...validRequestTransaction,
                    asset: {
                        ...validTestTransaction.asset,
                        unit: 1
                    },
                }
            );
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validRequestTransaction.passphrase);
            await (validTestTransaction as any).undoAsset(store);
            expect(store.account.getOrDefault).toHaveBeenCalledWith(
                "15435023355030673670L");
            expect(store.account.set).toHaveBeenCalledWith(
                "15435023355030673670L",
                expect.objectContaining({
                    publicKey: undefined,
                }));
            expect(store.account.set).toHaveBeenCalledWith(
                transactions.validRequestTransaction.contractId,
                expect.objectContaining({
                    address: transactions.validRequestTransaction.contractId,
                    balance: contract.balance + BigInt(contract.asset.unit.amount),
                    asset: expect.objectContaining({
                        payments: -1,
                        rev: 0,
                        state: "ACTIVE",
                        unit: expect.objectContaining({
                            "amount": "100000000",
                            "prepaid": 1,
                            "terminateFee": 0,
                            "total": 12,
                            "type": "HOURS",
                        })
                    })
                }),
            );

        });
    });
});
