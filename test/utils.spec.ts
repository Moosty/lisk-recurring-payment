import {
    assetBytesToPublicKey,
    getContractAddress,
} from "../src/utils";

describe('Test utils', () => {

    it("Get public key from bytes", () => {
        return expect(assetBytesToPublicKey('a')).toBe('ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb');
    });

    it("Get public key from bytes", () => {
        return expect(assetBytesToPublicKey('b')).toBe('3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d');
    });

    it("Get public key from bytes", () => {
        return expect(assetBytesToPublicKey('c')).toBe('2e7d2c03a9507ae265ecf5b5356885a53393a2029d241394997265a1a25aefc6')
    });

    it("Get address from publicKey", () => {
        return expect(getContractAddress(assetBytesToPublicKey('a'))).toBe('12309745231084994758L')
    });

    it("Get address from publicKey", () => {
        return expect(getContractAddress(assetBytesToPublicKey('b'))).toBe('14826229230706472623L')
    });
});
