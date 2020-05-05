export const transactions = {
    validCreateTransaction: {
        passphrase: 'creek own stem final gate scrub live shallow stage host concert they',
        senderId: '11237980039345381032L',
        contractId: '6095053878450376505L',
        contractPublicKey: 'fcfea51ed2465d8f1a607d06987d96152a112fae0937ea5af1b13037f0d1537e',
        input: {
            asset: {
                title: "TestContract",
                timestamp: 123,
                senderPublicKey: "5c554d43301786aec29a09b13b485176e81d1532347a351aeafe018c199fd7ca",
                recipientPublicKey: "bfdd0ed3914d6e1a3e9a039b6bdfda2b77f727cb708354c3d80d0ea945a8749a",
                unit: {
                    type: "MINUTES",
                    typeAmount: 1,
                    amount: '100000',
                    prepaid: 10,
                    total: 100,
                    terminateFee: 5,
                },
                data: '{}',
            }
        }
    },
    validReviewTransaction: {
        passphrase: 'detail rose problem pupil they relief rice melt burden day pistol tiger',
        passphraseWrong: 'creek own stem final gate scrub live shallow stage host concert they',
        senderId: '11495053542406076001L',
        contractId: '15435023355030673670L',
        contractPublicKey: '38a3ae5bef78e7923d7065eaae74727eb84fd5593c474d438271329b6a71f8c7',
        input: {
            asset: {
                contractPublicKey: '38a3ae5bef78e7923d7065eaae74727eb84fd5593c474d438271329b6a71f8c7',
                unit: {
                    type: "HOURS",
                    typeAmount: 2,
                    amount: '200000',
                    prepaid: 20,
                    total: 200,
                    terminateFee: 10,
                },
                unitOld: {
                    type: "MINUTES",
                    typeAmount: 1,
                    amount: '100000',
                    prepaid: 10,
                    total: 100,
                    terminateFee: 5,
                },
                data: '{ reference: "abc"}',
            }
        }
    },
    validRequestTransaction: {
        passphrase: 'creek own stem final gate scrub live shallow stage host concert they',
        passphraseWrong: 'stem own stem final gate scrub live shallow stage host concert they',
        senderId: '11237980039345381032L',
        contractId: '15435023355030673670L',
        contractPublicKey: '38a3ae5bef78e7923d7065eaae74727eb84fd5593c474d438271329b6a71f8c7',
        input: {
            asset: {
                contractPublicKey: '38a3ae5bef78e7923d7065eaae74727eb84fd5593c474d438271329b6a71f8c7',
                unit: 1,
                data: '{ reference: "abc"}',
            }
        }
    },
    validFundTransaction: {
        passphrase: 'detail rose problem pupil they relief rice melt burden day pistol tiger',
        passphraseWrong: 'problem rose problem pupil they relief rice melt burden day pistol tiger',
        senderId: '11495053542406076001L',
        contractId: '15435023355030673670L',
        contractPublicKey: '38a3ae5bef78e7923d7065eaae74727eb84fd5593c474d438271329b6a71f8c7',
        input: {
            asset: {
                contractPublicKey: '38a3ae5bef78e7923d7065eaae74727eb84fd5593c474d438271329b6a71f8c7',
                units: 12,
                data: '{ reference: "abc"}',
            }
        }
    },
    validTerminateTransaction: {
        passphrase: 'detail rose problem pupil they relief rice melt burden day pistol tiger',
        passphraseWrong: 'problem rose problem pupil they relief rice melt burden day pistol tiger',
        senderId: '11495053542406076001L',
        contractId: '15435023355030673670L',
        contractPublicKey: '38a3ae5bef78e7923d7065eaae74727eb84fd5593c474d438271329b6a71f8c7',
        input: {
            asset: {
                contractPublicKey: '38a3ae5bef78e7923d7065eaae74727eb84fd5593c474d438271329b6a71f8c7',
                peerPublicKey: '5c554d43301786aec29a09b13b485176e81d1532347a351aeafe018c199fd7ca',
                unit: 1,
                data: '{ reference: "abc"}',
            }
        }
    },
};
