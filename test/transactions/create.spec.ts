import { Account } from "@liskhq/lisk-transactions/dist-node";
import {
    CreateContract,
} from "../../src/transactions";

import {
    CreateContractTransaction,
} from "../../src";

import {
    transactions,
    accounts,
} from "../fixtures";

import {defaultAccount, defaultNetworkIdentifier, StateStoreMock} from '../helpers/state_store';
import {CreateTransactionJSON} from "../../src/interfaces";

describe('Test Create Transaction', () => {
    const validCreateTransaction = transactions.validCreateTransaction as Partial<CreateTransactionJSON>;
    let validTestTransaction: CreateContract;
    let sender: Account;
    let recipient: Account;
    beforeEach( () => {
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

        const store = new StateStoreMock([sender, recipient]);

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
                transactions.validCreateTransaction.asset.data,
            );
        });

        it('should set asset contractPublicKey', async () => {
            expect(validTestTransaction.asset).toEqual(
                transactions.validCreateTransaction.asset,
            );
        });

        it('should set asset recipientPublicKey', async () => {
            expect(validTestTransaction.asset.recipientPublicKey).toEqual(
                transactions.validCreateTransaction.asset.recipientPublicKey,
            );
        });

        it('should set asset senderPublicKey', async () => {
            expect(validTestTransaction.asset.senderPublicKey).toEqual(
                transactions.validCreateTransaction.asset.senderPublicKey,
            );
        });
    });

    describe('#assetToJSON', () => {
        it('should return an object of type create asset', async () => {
            const assetJson = validTestTransaction.assetToJSON() as any;
            expect(assetJson).toEqual('');
        });
    });

    // TODO ADD TIMESTAMP :(

    describe('#assetToJSON', () => {
        it('should return an object of type create asset', async () => {
            validTestTransaction.sign(defaultNetworkIdentifier, accounts.defaultAccount.passphrase);
            expect(validTestTransaction.id).toEqual('');
        });
    });
});
