import {Account, TransactionError} from '@liskhq/lisk-transactions/dist-node';
import {
    FundContract,
} from '../../src/transactions';
import {
    FundContractTransaction,
} from '../../src';
import {
    transactions,
    accounts,
} from '../fixtures';
import {defaultAccount, defaultNetworkIdentifier, StateStoreMock} from '../helpers/state_store';
import {ContractInterface, FundAssetJSON} from '../../src/interfaces';
import {getContractAddress} from '../../src/utils';
import {PAYMENT_TYPE, STATES} from "../../src/constants";

describe('Test Fund Transaction', () => {
    const validFundTransaction = transactions.validFundTransaction.input as Partial<FundAssetJSON>;
    let validTestTransaction: FundContract;
    let sender: Account;
    let recipient: Account;
    let contract: ContractInterface;
    let store: StateStoreMock;

    beforeEach(() => {
        validTestTransaction = new FundContractTransaction(
            validFundTransaction,
        );
        sender = {
            ...defaultAccount,
            balance: BigInt('100000000000'),
            address: accounts.secondAccount.senderId,
        };

        recipient = {
            ...defaultAccount,
            balance: BigInt('100000000000'),
            address: accounts.defaultAccount.senderId,
        };

        contract = {
            ...defaultAccount,
            address: "15435023355030673670L",
            balance: BigInt("0"),
            asset: {
                type: PAYMENT_TYPE,
                state: STATES.ACCEPTED,
                title: 'testTitle',
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
                start: 0,
            }
        }

        store = new StateStoreMock([sender, recipient, contract], {
            lastBlockHeader: {
                "version": 1,
                "height": 123,
                "timestamp": 28227090,
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
        });

        jest.spyOn(store.account, 'cache');
        jest.spyOn(store.account, 'get');
        jest.spyOn(store.account, 'getOrDefault');
        jest.spyOn(store.account, 'set');
    });

    describe('#constructor', () => {
        it('should create instance of FundContract', async () => {
            expect(validTestTransaction).toBeInstanceOf(FundContract);
        });

        it('should set asset data', async () => {
            expect(validTestTransaction.asset.data).toEqual(
                transactions.validFundTransaction.input.asset.data,
            );
        });

        it('should set asset unit', async () => {
            expect(validTestTransaction.asset.units).toEqual(
                transactions.validFundTransaction.input.asset.units,
            );
        });

        it('should set asset contractPublicKey', async () => {
            expect(validTestTransaction.asset.contractPublicKey).toEqual(
                transactions.validFundTransaction.input.asset.contractPublicKey,
            );
        });


    });

    describe('#assetToJSON', () => {
        it('should return an object of type review asset', async () => {
            const assetJson = validTestTransaction.assetToJSON() as any;
            expect(assetJson).toEqual(transactions.validFundTransaction.input.asset);
        });
    });

    describe('#validateAssets', () => {

        it('should return no errors', async () => {
            const errors = (validTestTransaction as any).validateAsset();
            expect(errors.length).toEqual(0);
        });

        it('should return unit error', async () => {
            validTestTransaction = new FundContractTransaction(
                {
                    ...validFundTransaction,
                    asset: {
                        contractPublicKey: validTestTransaction.asset.contractPublicKey,
                    },
                }
            );
            const errors = (validTestTransaction as any).validateAsset();
            expect(errors.length).toEqual(1);
            expect(errors[0].message).toEqual("'.asset' should have required property 'units'");
        });
    });

    describe('#prepare', () => {
        it('should call state store', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validFundTransaction.passphrase);
            await validTestTransaction.prepare(store);
            expect(store.account.cache).toHaveBeenCalledWith([
                {address: transactions.validFundTransaction.senderId},
                {address: getContractAddress(transactions.validFundTransaction.input.asset.contractPublicKey)},
            ]);
        });
    });

    describe('#applyAsset', () => {
        it('should return no errors', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validFundTransaction.passphrase);
            const errors = (validTestTransaction as any).applyAsset(store);
            expect(Object.keys(errors)).toHaveLength(0);
        });

        it('should call state store', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validFundTransaction.passphrase);
            await (validTestTransaction as any).applyAsset(store);
            expect(store.account.getOrDefault).toHaveBeenCalledWith(
                transactions.validFundTransaction.contractId,
            );
            expect(store.account.getOrDefault).toHaveBeenCalledWith(
                transactions.validFundTransaction.senderId,
            );
            expect(store.account.set).toHaveBeenCalledWith(
                transactions.validFundTransaction.contractId,
                expect.objectContaining({
                    address: transactions.validFundTransaction.contractId,
                    balance: contract.balance + (BigInt(validTestTransaction.asset.units) * BigInt(contract.asset.unit.amount)),
                    asset: expect.objectContaining({
                        start: 28227090,
                    })
                }),
            );
            expect(store.account.set).toHaveBeenCalledWith(
                transactions.validFundTransaction.senderId,
                expect.objectContaining({
                    balance: sender.balance - (BigInt(validTestTransaction.asset.units) * BigInt(contract.asset.unit.amount)),
                }),
            );
        });


        it('should return wrong units number error', async () => {
            validTestTransaction = new FundContractTransaction(
                {
                    ...validFundTransaction,
                    asset: {
                        ...validTestTransaction.asset,
                        units: 1000
                    },
                }
            );
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validFundTransaction.passphrase);
            const errors = await (validTestTransaction as any).applyAsset(store);
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                'Too many `.asset.units` for this contract',
            );
        });

        it('should return low balance error', async () => {
            sender.balance = BigInt(10);
            store = new StateStoreMock([sender, recipient, contract]);

            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validFundTransaction.passphrase);
            const errors = await (validTestTransaction as any).applyAsset(store);
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                'Senders balance is too low',
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
            store = new StateStoreMock([sender, recipient, contract]);

            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validFundTransaction.passphrase);
            const errors = await (validTestTransaction as any).applyAsset(store);
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                'Recurring payment contract is not accepted nor active',
            );
        });

        it('should return not a contract error', async () => {
            validTestTransaction = new FundContractTransaction(
                {
                    ...validFundTransaction,
                    asset: {
                        ...validTestTransaction.asset,
                        contractPublicKey: "bfdd0ed3914d6e1a3e9a039b6bdfda2b77f727cb708354c3d80d0ea945a8749a"
                    },
                }
            );
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validFundTransaction.passphrase);
            const errors = await (validTestTransaction as any).applyAsset(store);
            expect(errors.length).toEqual(1);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                '`contractPublicKey` not a recurring payment contract.',
            );
        });

        it('should return wrong recipientId error', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validFundTransaction.passphraseWrong);
            const errors = await (validTestTransaction as any).applyAsset(store);
            expect(errors.length).toEqual(2);
            expect(errors[0]).toBeInstanceOf(TransactionError);
            expect(errors[0].message).toContain(
                'Sender is not sender in this contract',
            );
            expect(errors[1]).toBeInstanceOf(TransactionError);
            expect(errors[1].message).toContain(
                'Senders balance is too low',
            );
        });
    });

    describe('#undoAsset', () => {
        it('should call state store', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, transactions.validFundTransaction.passphrase);
            await (validTestTransaction as any).undoAsset(store);
            expect(store.account.getOrDefault).toHaveBeenCalledWith(
                transactions.validFundTransaction.contractId);
            expect(store.account.set).toHaveBeenCalledWith(
                transactions.validFundTransaction.contractId,
                expect.objectContaining({
                    address: transactions.validFundTransaction.contractId,
                    balance: contract.balance - (BigInt(validTestTransaction.asset.units) * BigInt(contract.asset.unit.amount)),
                }),
            );
            expect(store.account.set).toHaveBeenCalledWith(
                transactions.validFundTransaction.senderId,
                expect.objectContaining({
                    balance: sender.balance + (BigInt(validTestTransaction.asset.units) * BigInt(contract.asset.unit.amount)),
                }));


        });
    });
});
