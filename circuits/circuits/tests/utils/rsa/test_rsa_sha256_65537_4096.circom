pragma circom 2.1.9;

include "../../../utils/rsa/verifyRsaPkcs1v1_5.circom";

template VerifyRsaPkcs1v1_5Tester() {
    signal input signature[64];
    signal input modulus[64];
    signal input message[64];

    signal input dummy;

    VerifyRsaPkcs1v1_5(10, 64, 64, 65537, 256)(signature, modulus, message, dummy);
}

component main = VerifyRsaPkcs1v1_5Tester();