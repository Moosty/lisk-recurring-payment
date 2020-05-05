import {Account, TransactionError} from '@liskhq/lisk-transactions/dist-node';
import {
    TerminateContract,
} from '../../src/transactions';
import {
    TerminateContractTransaction,
} from '../../src';
import {
    transactions,
    accounts,
} from '../fixtures';
import {defaultAccount, defaultNetworkIdentifier, StateStoreMock} from '../helpers/state_store';
import {ContractInterface, TerminateAssetJSON} from '../../src/interfaces';
import {getContractAddress} from '../../src/utils';
import {PAYMENT_TYPE, STATES} from "../../src/constants";
import {getAddressFromPublicKey} from "@liskhq/lisk-cryptography/dist-node";

describe('Test Terminate Transaction', () => {
    const validTerminateTransaction = transactions.validTerminateTransaction.input as Partial<TerminateAssetJSON>;
    let validTestTransaction: TerminateContract;
    let sender: Account;
    let recipient: Account;
    let contract: ContractInterface;
    let store: StateStoreMock;
    let defaultBlockHeader;

    beforeEach(() => {
        validTestTransaction = new TerminateContractTransaction(
            validTerminateTransaction,
        );
        sender = {
            ...defaultAccount,
            balance: BigInt('0'),
            address: accounts.secondAccount.senderId,
        };

        recipient = {
            ...defaultAccount,
            balance: BigInt('0'),
            address: accounts.defaultAccount.senderId,
        };

        contract = {
            ...defaultAccount,
            address: "15435023355030673670L",
            balance: BigInt("100000"),
            asset: {
                type: PAYMENT_TYPE,
                title: "testTitle",
                state: STATES.ACTIVE,
                unit: {
                    type: "HOURS",
                    typeAmount: 1,
                    amount: "10000",
                    prepaid: 1,
                    total: 12,
                    terminateFee: 1,
                },
                recipientPublicKey: "5c554d43301786aec29a09b13b485176e81d1532347a351aeafe018c199fd7ca",
                senderPublicKey: "bfdd0ed3914d6e1a3e9a039b6bdfda2b77f727cb708354c3d80d0ea945a8749a",
                rev: 0,
                payments: 0,
                start: 100,
                lastBalance: '100000'
            }
        }

        defaultBlockHeader = {
            lastBlockHeader: {
                "version": 1,
                "height": 123,
                "timestamp": 4400,
                "generatorPublicKey": "968ba2fa993ea9dc27ed740da0daf49eddd740dbd7cb1cb4fc5db3a20baf341b",
                "payloadLength": 117,
                "payloadHash": "4e4d91be041e09a2e54bb7dd38f1f2a02ee7432ec9f169ba63cd1f193a733dd2",
                "blockSignature": "a3733254aad600fa787d6223002278c3400be5e8ed4763ae27f9a15b80e20c22ac9259dc926f4f4cabdf0e4f8cec49308fa8296d71c288f56b9d1e11dfe81e07",
                "previousBlockId": "15918760246746894806",
                "numberOfTransactions": 15,
                "totalAmount": BigInt("150000000"),
                "totalFee": BigInt("15000000"),
                "reward": BigInt("50000000"),
                "maxHeightPreviouslyForged": 122,
                "maxHeightPrevoted": 122,
                "seedReveal": ""
            }
        };

        store = new StateStoreMock([sender, recipient, contract], defaultBlockHeader);

        jest.spyOn(store.account, 'cache');
        jest.spyOn(store.account, 'get');
        jest.spyOn(store.account, 'getOrDefault');
        jest.spyOn(store.account, 'set');
    });

    describe('#constructor', () => {
        it('should create instance of TerminateContract', async () => {
            expect(validTestTransaction).toBeInstanceOf(TerminateContract);
        });

        it('should create empty instance of CreateContract', async () => {
            validTestTransaction = new TerminateContractTransaction({});
            expect(validTestTransaction).toBeInstanceOf(TerminateContract);
            expect(validTestTransaction.asset.unit).toEqual(
                undefined,
            );
        });

        it('should set asset data', async () => {
            expect(validTestTransaction.asset.data).toEqual(
                transactions.validTerminateTransaction.input.asset.data,
            );
        });

        it('should set asset peerPublicKey', async () => {
            expect(validTestTransaction.asset.peerPublicKey).toEqual(
                transactions.validTerminateTransaction.input.asset.peerPublicKey,
            );
        });

        it('should set asset contractPublicKey', async () => {
            expect(validTestTransaction.asset.contractPublicKey).toEqual(
                transactions.validTerminateTransaction.input.asset.contractPublicKey,
            );
        });


    });

    describe('#assetToJSON', () => {
        it('should return an object of type review asset', async () => {
            const assetJson = validTestTransaction.assetToJSON() as any;
            expect(assetJson).toEqual(transactions.validTerminateTransaction.input.asset);
        });
    });

    describe('#validateAssets', () => {

        it('should return no errors', async () => {
            const errors = (validTestTransaction as any).validateAsset();
            expect(errors.length).toEqual(0);
        });

        it('should return peerPublicKey error', async () => {
            validTestTransaction = new TerminateContractTransaction(
                {
                    ...validTerminateTransaction,
                    asset: {
                        contractPublicKey: validTestTransaction.asset.contractPublicKey,
                    },
                }
            );
            const errors = (validTestTransaction as any).validateAsset();
            expect(errors.length).toEqual(1);
            expect(errors[0].message).toEqual("'.asset' should have required property 'peerPublicKey'");
        });
    });

    describe('#prepare', () => {
        it('should call state store', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validTerminateTransaction.passphrase);
            await validTestTransaction.prepare(store);
            expect(store.account.cache).toHaveBeenCalledWith([
                {address: transactions.validTerminateTransaction.senderId},
                {address: getContractAddress(transactions.validTerminateTransaction.input.asset.contractPublicKey)},
                {address: getAddressFromPublicKey(transactions.validTerminateTransaction.input.asset.peerPublicKey)},
            ]);
        });
    });

    describe('#applyAsset', () => {
        it('should return no errors', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validTerminateTransaction.passphrase);
            const errors = (validTestTransaction as any).applyAsset(store);
            expect(Object.keys(errors)).toHaveLength(0);
        });

        it('should call state store', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validTerminateTransaction.passphrase);
            await (validTestTransaction as any).applyAsset(store);
            expect(store.account.getOrDefault).toHaveBeenCalledWith(
                transactions.validTerminateTransaction.contractId,
            );
            expect(store.account.getOrDefault).toHaveBeenCalledWith(
                transactions.validTerminateTransaction.senderId,
            );
            expect(store.account.getOrDefault).toHaveBeenCalledWith(
                getAddressFromPublicKey(transactions.validTerminateTransaction.input.asset.peerPublicKey),
            );
            expect(store.account.set).toHaveBeenCalledWith(
                transactions.validTerminateTransaction.contractId,
                expect.objectContaining({
                    address: transactions.validTerminateTransaction.contractId,
                    balance: BigInt(0),
                }),
            );
            expect(store.account.set).toHaveBeenCalledWith(
                transactions.validTerminateTransaction.senderId,
                expect.objectContaining({
                    balance: sender.balance + (BigInt(contract.asset.unit.amount) * BigInt(8)),
                }),
            );
            expect(store.account.set).toHaveBeenCalledWith(
                getAddressFromPublicKey(transactions.validTerminateTransaction.input.asset.peerPublicKey),
                expect.objectContaining({
                    balance: sender.balance + (BigInt(2) * BigInt(contract.asset.unit.amount)),
                }),
            );
        });

        it('should return wrong state error', async () => {
            contract = {
                ...contract,
                asset: {
                    ...contract.asset,
                    state: STATES.RECIPIENT_REVIEW,
                }
            }
            store = new StateStoreMock([sender, recipient, contract], defaultBlockHeader);

            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validTerminateTransaction.passphrase);
            const errors = await (validTestTransaction as any).applyAsset(store);
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                'Contract is not in active state.',
            );
        });

        it('should update balances correct', async () => {
            contract = {
                ...contract,
                balance: BigInt(10),
                asset: {
                    ...contract.asset,
                    state: STATES.ACTIVE,
                }
            }
            store = new StateStoreMock([sender, recipient, contract], defaultBlockHeader);
            jest.spyOn(store.account, 'cache');
            jest.spyOn(store.account, 'get');
            jest.spyOn(store.account, 'getOrDefault');
            jest.spyOn(store.account, 'set');
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validTerminateTransaction.passphrase);
            const errors = await (validTestTransaction as any).applyAsset(store);
            expect(errors.length).toEqual(0);
            expect(store.account.getOrDefault).toHaveBeenCalledWith(
                transactions.validTerminateTransaction.contractId,
            );
            expect(store.account.getOrDefault).toHaveBeenCalledWith(
                transactions.validTerminateTransaction.senderId,
            );
            expect(store.account.getOrDefault).toHaveBeenCalledWith(
                getAddressFromPublicKey(transactions.validTerminateTransaction.input.asset.peerPublicKey),
            );
            expect(store.account.set).toHaveBeenCalledWith(
                transactions.validTerminateTransaction.contractId,
                expect.objectContaining({
                    address: transactions.validTerminateTransaction.contractId,
                    balance: BigInt(0),
                }),
            );
            expect(store.account.set).toHaveBeenCalledWith(
                transactions.validTerminateTransaction.senderId,
                expect.objectContaining({
                    balance: sender.balance,
                }),
            );
            expect(store.account.set).toHaveBeenCalledWith(
                getAddressFromPublicKey(transactions.validTerminateTransaction.input.asset.peerPublicKey),
                expect.objectContaining({
                    balance: recipient.balance + BigInt(10),
                }),
            );
        });

        it('should return not a contract error', async () => {
            validTestTransaction = new TerminateContractTransaction(
                {
                    ...validTerminateTransaction,
                    asset: {
                        ...validTestTransaction.asset,
                        contractPublicKey: "bfdd0ed3914d6e1a3e9a039b6bdfda2b77f727cb708354c3d80d0ea945a8749a"
                    },
                }
            );
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validTerminateTransaction.passphrase);
            const errors = await (validTestTransaction as any).applyAsset(store);
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                '`contractPublicKey` not a recurring payment contract.',
            );
        });

        it('should return no valid peer error', async () => {
            validTestTransaction = new TerminateContractTransaction(
                {
                    ...validTerminateTransaction,
                    asset: {
                        ...validTestTransaction.asset,
                        contractPublicKey: "38a3ae5bef78e7923d7065eaae74727eb84fd5593c474d438271329b6a71f8c7",
                        peerPublicKey: "38a3ae5bef78e7923d7065eaae74727eb84fd5593c474d438271329b6a71f8c7"
                    },
                }
            );
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validTerminateTransaction.passphrase);
            const errors = await (validTestTransaction as any).applyAsset(store);
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                'PeerPublicKey is not participant in contract',
            );
        });

        it('should return wrong recipientId error', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validTerminateTransaction.passphraseWrong);
            const errors = await (validTestTransaction as any).applyAsset(store);
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                'Sender is not participant in contract',
            );
        });
    });

    describe('#undoAsset', () => {
        it('should call state store', async () => {
            await (validTestTransaction as any).undoAsset(store);
            expect(store.account.getOrDefault).toHaveBeenCalledWith(transactions.validTerminateTransaction.contractId);
            expect(store.account.getOrDefault).toHaveBeenCalledWith(getAddressFromPublicKey(transactions.validTerminateTransaction.input.asset.peerPublicKey));
            expect(store.account.getOrDefault).toHaveBeenCalledWith(transactions.validTerminateTransaction.senderId);
            expect(store.account.set).toHaveBeenCalledWith(
                transactions.validTerminateTransaction.contractId,
                expect.objectContaining({
                    address: transactions.validTerminateTransaction.contractId,
                    balance: contract.balance + BigInt(contract.asset.lastBalance),
                })
            );
            expect(store.account.set).toHaveBeenCalledWith(
                transactions.validTerminateTransaction.senderId,
                expect.objectContaining({
                    balance: sender.balance - (BigInt(9) * BigInt(contract.asset.unit.amount)),
                })
            );
            expect(store.account.set).toHaveBeenCalledWith(
                getAddressFromPublicKey(transactions.validTerminateTransaction.input.asset.peerPublicKey),
                expect.objectContaining({
                    balance: sender.balance - BigInt(contract.asset.unit.amount),
                })
            );
        });

        it('should update balances correct', async () => {
            contract = {
                ...contract,
                balance: BigInt(0),
                asset: {
                    ...contract.asset,
                    state: STATES.ACTIVE,
                    lastBalance: '10',
                }
            }
            store = new StateStoreMock([sender, recipient, contract], defaultBlockHeader);
            jest.spyOn(store.account, 'cache');
            jest.spyOn(store.account, 'get');
            jest.spyOn(store.account, 'getOrDefault');
            jest.spyOn(store.account, 'set');
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validTerminateTransaction.passphrase);
            const errors = await (validTestTransaction as any).undoAsset(store);
            expect(errors.length).toEqual(0);
            expect(store.account.getOrDefault).toHaveBeenCalledWith(
                transactions.validTerminateTransaction.contractId,
            );
            expect(store.account.getOrDefault).toHaveBeenCalledWith(
                transactions.validTerminateTransaction.senderId,
            );
            expect(store.account.getOrDefault).toHaveBeenCalledWith(
                getAddressFromPublicKey(transactions.validTerminateTransaction.input.asset.peerPublicKey),
            );
            expect(store.account.set).toHaveBeenCalledWith(
                transactions.validTerminateTransaction.contractId,
                expect.objectContaining({
                    address: transactions.validTerminateTransaction.contractId,
                    balance: BigInt(10),
                }),
            );
            expect(store.account.set).toHaveBeenCalledWith(
                transactions.validTerminateTransaction.senderId,
                expect.objectContaining({
                    balance: sender.balance,
                }),
            );
            expect(store.account.set).toHaveBeenCalledWith(
                getAddressFromPublicKey(transactions.validTerminateTransaction.input.asset.peerPublicKey),
                expect.objectContaining({
                    balance: recipient.balance - BigInt(10),
                }),
            );
        });
    });
});
