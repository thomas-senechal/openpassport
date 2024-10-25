import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { SignatureAlgorithmIndex } from "../../../common/src/constants/constants";

export default buildModule("Deploy_All", (m) => {

    const verifier_dsc_rsa_65537_sha1_4096 = m.contract("Verifier_dsc_rsa_65537_sha1_4096");
    const verifier_dsc_rsa_65537_sha256_4096 = m.contract("Verifier_dsc_rsa_65537_sha256_4096");
    const verifier_dsc_rsapss_65537_sha256_4096 = m.contract("Verifier_dsc_rsapss_65537_sha256_4096");

    const verifier_prove_rsa_65537_sha1 = m.contract("Verifier_prove_rsa_65537_sha1");
    const verifier_prove_rsa_65537_sha256 = m.contract("Verifier_prove_rsa_65537_sha256");
    const verifier_prove_rsapss_65537_sha256 = m.contract("Verifier_prove_rsapss_65537_sha256");

    const genericVerifier = m.contract("GenericVerifier");
    const openPassportVerifier = m.contract("OpenPassportVerifier", [genericVerifier]);

    m.call(genericVerifier, "updateVerifier", [0, SignatureAlgorithmIndex.rsa_65537_sha1_4096, verifier_dsc_rsa_65537_sha1_4096], { id: "setting verifier_dsc_rsa_65537_sha1_4096" });
    m.call(genericVerifier, "updateVerifier", [0, SignatureAlgorithmIndex.rsa_65537_sha256_4096, verifier_dsc_rsa_65537_sha256_4096], { id: "setting verifier_dsc_rsa_65537_sha256_4096" });
    m.call(genericVerifier, "updateVerifier", [0, SignatureAlgorithmIndex.rsapss_65537_sha256_4096, verifier_dsc_rsapss_65537_sha256_4096], { id: "setting verifier_dsc_rsapss_65537_sha256_4096" });
    m.call(genericVerifier, "updateVerifier", [0, SignatureAlgorithmIndex.rsa_65537_sha1_2048, verifier_prove_rsa_65537_sha1], { id: "setting verifier_prove_rsa_65537_sha1" });
    m.call(genericVerifier, "updateVerifier", [0, SignatureAlgorithmIndex.rsa_65537_sha256_2048, verifier_prove_rsa_65537_sha256], { id: "setting verifier_prove_rsa_65537_sha256" });
    m.call(genericVerifier, "updateVerifier", [0, SignatureAlgorithmIndex.rsapss_65537_sha256_2048, verifier_prove_rsapss_65537_sha256], { id: "setting verifier_prove_rsapss_65537_sha256" });


    return {
        verifier_dsc_rsa_65537_sha1_4096,
        verifier_dsc_rsa_65537_sha256_4096,
        verifier_dsc_rsapss_65537_sha256_4096,
        verifier_prove_rsa_65537_sha1,
        verifier_prove_rsa_65537_sha256,
        verifier_prove_rsapss_65537_sha256,
        genericVerifier,
        openPassportVerifier
    };
});

