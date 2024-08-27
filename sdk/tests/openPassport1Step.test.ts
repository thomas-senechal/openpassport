import { assert, expect } from 'chai'
import { describe, it } from 'mocha';
import { groth16 } from 'snarkjs';
import { generateCircuitInputsProve } from '../../common/src/utils/generateInputs';
import { OpenPassport1StepVerifier, OpenPassport1StepInputs } from '../src/OpenPassport1Step';
import { genMockPassportData } from '../../common/src/utils/genMockPassportData';
describe('Circuit Proving Tests', function () {
    this.timeout(0);

    it('OpenPassport1Step - should verify', async function () {
        const path_prove_wasm = "../circuits/build/fromAWS/prove_rsa_65537_sha256.wasm";
        const path_prove_zkey = "../circuits/build/fromAWS/prove_rsa_65537_sha256.zkey";
        const passportData = genMockPassportData('rsa sha256', 'FRA', '000101', '300101');
        const bitmap = Array(90).fill("1");
        const scope = BigInt(1).toString();
        const majority = "18";
        const user_identifier = '0xE6E4b6a802F2e0aeE5676f6010e0AF5C9CDd0a50';
        const n_dsc = 64;
        const k_dsc = 32;
        const inputs = generateCircuitInputsProve(
            passportData,
            n_dsc,
            k_dsc,
            scope,
            bitmap,
            majority,
            user_identifier
        );
        const { proof, publicSignals } = await groth16.fullProve(
            inputs,
            path_prove_wasm,
            path_prove_zkey
        );
        const openPassportProveVerifier = new OpenPassport1StepVerifier({
            scope: scope,
            requirements: [["older_than", "18"], ["nationality", "France"]],
            dev_mode: true
        });
        const openPassportProverInputs = new OpenPassport1StepInputs(publicSignals, proof as any, passportData.dsc as string);
        const result = await openPassportProveVerifier.verify(openPassportProverInputs);
        console.log(result);
        expect(result.valid).to.be.true;
    });

});