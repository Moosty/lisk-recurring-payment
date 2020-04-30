import {Account, TransactionError} from '@liskhq/lisk-transactions/dist-node';
import {
    CreateContract,
} from '../../src/transactions';
import {
    CreateContractTransaction,
} from '../../src';
import {
    transactions,
    accounts,
} from '../fixtures';
import {defaultAccount, defaultNetworkIdentifier, StateStoreMock} from '../helpers/state_store';
import {CreateAssetJSON} from '../../src/interfaces';

describe('Test Create Transaction', () => {
    const validCreateTransaction = transactions.validCreateTransaction.input as Partial<CreateAssetJSON>;
    let validTestTransaction: CreateContract;
    let sender: Account;
    let recipient: Account;
    let store: StateStoreMock;

    beforeEach(() => {
        validTestTransaction = new CreateContractTransaction(
            validCreateTransaction,
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

        store = new StateStoreMock([sender, recipient]);

        jest.spyOn(store.account, 'cache');
        jest.spyOn(store.account, 'get');
        jest.spyOn(store.account, 'getOrDefault');
        jest.spyOn(store.account, 'set');
    });

    describe('#constructor', () => {
        it('should create instance of CreateContract', async () => {
            expect(validTestTransaction).toBeInstanceOf(CreateContract);
        });

        it('should set asset data', async () => {
            expect(validTestTransaction.asset.data).toEqual(
                transactions.validCreateTransaction.input.asset.data,
            );
        });

        it('should set asset contractPublicKey', async () => {
            expect(validTestTransaction.asset).toEqual(
                transactions.validCreateTransaction.input.asset,
            );
        });

        it('should set asset recipientPublicKey', async () => {
            expect(validTestTransaction.asset.recipientPublicKey).toEqual(
                transactions.validCreateTransaction.input.asset.recipientPublicKey,
            );
        });

        it('should set asset senderPublicKey', async () => {
            expect(validTestTransaction.asset.senderPublicKey).toEqual(
                transactions.validCreateTransaction.input.asset.senderPublicKey,
            );
        });
    });

    describe('#assetToJSON', () => {
        it('should return an object of type create asset', async () => {
            const assetJson = validTestTransaction.assetToJSON() as any;
            expect(assetJson).toEqual(transactions.validCreateTransaction.input.asset);
        });
    });

    describe('#getContractId', () => {
        it('should return contractPublicKey', async () => {
            expect(validTestTransaction.getContractPublicKey()).toEqual(transactions.validCreateTransaction.contractPublicKey);
        });

        it('should return contractId', async () => {
            expect(validTestTransaction.getContractId()).toEqual(transactions.validCreateTransaction.contractId);
        });

        it('should return contractPublicKey', async () => {
            let validTestTransactionTime = new CreateContractTransaction(
                {
                    ...validCreateTransaction,
                    asset: {
                        ...validTestTransaction.asset,
                        timestamp: 6563444,
                    },
                });
            expect(validTestTransactionTime.getContractPublicKey()).toEqual("db3cc5c55b16a47a001f98c8ff83f3e6b52faca12611de452c4a0ed07f5ac34c");
        });
    });

    describe('#validateAssets', () => {
        it('should return no errors', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validCreateTransaction.passphrase);
            const errors = (validTestTransaction as any).validateAsset();
            expect(errors.length).toEqual(0);
        });

        it('should return senderPublicKey error', async () => {
            const errors = (validTestTransaction as any).validateAsset();
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                '`.asset.recipientPublicKey` or `.asset.senderPublicKey` should be the same as `senderPublicKey`.',
            );
        });

        it('should return contractPublicKey error', async () => {
            const wrongContractPublicKeyTransaction = new CreateContractTransaction(
                {
                    ...validCreateTransaction,
                    asset: {
                        ...validTestTransaction.asset,
                        contractPublicKey: "AA",
                    },
                });
            wrongContractPublicKeyTransaction.sign(defaultNetworkIdentifier, transactions.validCreateTransaction.passphrase);

            const errors = (wrongContractPublicKeyTransaction as any).validateAsset();
            expect(errors.length).toEqual(2);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                `'.contractPublicKey' should match format "publicKey"`,
            );
            expect(errors[1]).toBeInstanceOf(TransactionError);
            expect(errors[1].message).toContain(
                '`.asset.contractPublicKey` should be different.',
            );
        });
    });

    describe('#prepare', () => {
        it('should call state store', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validCreateTransaction.passphrase);
            await validTestTransaction.prepare(store);
            expect(store.account.cache).toHaveBeenCalledWith([
                { address: transactions.validCreateTransaction.senderId },
                { address: validTestTransaction.getContractId() },
            ]);
        });
    });

    describe('#applyAsset', () => {
        it('should return no errors', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validCreateTransaction.passphrase);
            const errors = (validTestTransaction as any).applyAsset(store);
            expect(Object.keys(errors)).toHaveLength(0);
        });

        it('should call state store', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validCreateTransaction.passphrase);
            await (validTestTransaction as any).applyAsset(store);
            expect(store.account.getOrDefault).toHaveBeenCalledWith(
                transactions.validCreateTransaction.contractId,
            );
            expect(store.account.set).toHaveBeenCalledWith(
                transactions.validCreateTransaction.contractId,
                expect.objectContaining({
                    address: transactions.validCreateTransaction.contractId,
                    publicKey: validTestTransaction.getContractPublicKey(),
                }),
            );

        });
    });

    describe('#undoAsset', () => {
        it('should call state store', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validCreateTransaction.passphrase);
            await (validTestTransaction as any).undoAsset(store);
            expect(store.account.getOrDefault).toHaveBeenCalledWith(
                validTestTransaction.getContractId(),
            );

            expect(store.account.set).toHaveBeenCalledWith(
                validTestTransaction.getContractId(),
                expect.objectContaining({
                    address: validTestTransaction.getContractId(),
                    publicKey: undefined,
                }),
            );
        });
    });
});
