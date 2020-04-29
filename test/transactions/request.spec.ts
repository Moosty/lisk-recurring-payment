import {
    assetBytesToPublicKey,
} from "../../src/utils";

describe('Test Request', () => {

    it("Get public key from bytes", () => {
        return expect(assetBytesToPublicKey('a')).toBe('30323330ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb');
    });

});
