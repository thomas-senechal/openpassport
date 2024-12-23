import * as asn1js from "asn1js";
import { Certificate, RSAPublicKey, RSASSAPSSParams } from "pkijs";
import { extractHashFunction, getFriendlyName } from "./oids";
import { CertificateData, PublicKeyDetailsECDSA, PublicKeyDetailsRSA, PublicKeyDetailsRSAPSS } from "./dataStructure";
import { getECDSACurveBits, identifyCurve, StandardCurve } from "./curves";
import { getIssuerCountryCode, getSubjectKeyIdentifier } from "./utils";
import fs from 'fs';
import { execSync } from 'child_process';

export function parseCertificate(pem: string, fileName: string): any {
    let certificateData: CertificateData = {
        id: '',
        issuer: '',
        validity: {
            notBefore: '',
            notAfter: ''
        },
        subjectKeyIdentifier: '',
        signatureAlgorithm: '',
        hashAlgorithm: '',
        publicKeyDetails: undefined,
        rawPem: '',
        rawTxt: ''
    };
    try {
        const pemFormatted = pem.replace(/(-----(BEGIN|END) CERTIFICATE-----|\n|\r)/g, "");
        const binary = Buffer.from(pemFormatted, "base64");
        const arrayBuffer = new ArrayBuffer(binary.length);
        const view = new Uint8Array(arrayBuffer);
        for (let i = 0; i < binary.length; i++) {
            view[i] = binary[i];
        }

        const asn1 = asn1js.fromBER(arrayBuffer);
        if (asn1.offset === -1) {
            throw new Error(`ASN.1 parsing error: ${asn1.result.error}`);
        }

        const cert = new Certificate({ schema: asn1.result });
        const publicKeyAlgoOID = cert.subjectPublicKeyInfo.algorithm.algorithmId;
        const publicKeyAlgoFN = getFriendlyName(publicKeyAlgoOID);
        const signatureAlgoOID = cert.signatureAlgorithm.algorithmId;
        const signatureAlgoFN = getFriendlyName(signatureAlgoOID);


        let params;
        if (publicKeyAlgoFN === 'RSA') {
            if (signatureAlgoFN === 'RSASSA_PSS') {
                certificateData.signatureAlgorithm = "rsapss";
                params = getParamsRSAPSS(cert);
                certificateData.hashAlgorithm = (params as PublicKeyDetailsRSAPSS).hashAlgorithm;
            }
            else {
                certificateData.hashAlgorithm = extractHashFunction(signatureAlgoFN);
                certificateData.signatureAlgorithm = "rsa";
                params = getParamsRSA(cert);
            }

        }
        else if (publicKeyAlgoFN === 'ECC') {
            certificateData.hashAlgorithm = extractHashFunction(signatureAlgoFN);
            certificateData.signatureAlgorithm = "ecdsa";
            params = getParamsECDSA(cert);
        }
        else {
            console.log(publicKeyAlgoFN);
        }
        certificateData.publicKeyDetails = params;
        certificateData.issuer = getIssuerCountryCode(cert);;
        certificateData.validity = {
            notBefore: cert.notBefore.value.toString(),
            notAfter: cert.notAfter.value.toString()
        };
        const ski = getSubjectKeyIdentifier(cert);
        certificateData.id = ski.slice(0, 12);
        certificateData.subjectKeyIdentifier = ski;

        certificateData.rawPem = pem;
        const tempCertPath = `/tmp/${fileName}.pem`;
        fs.writeFileSync(tempCertPath, pem);
        try {
            const openSslOutput = execSync(`openssl x509 -in ${tempCertPath} -text -noout`).toString();
            certificateData.rawTxt = openSslOutput;
        } catch (error) {
            console.error(`Error executing OpenSSL command: ${error}`);
            certificateData.rawTxt = 'Error: Unable to generate human-readable format';
        } finally {
            fs.unlinkSync(tempCertPath);
        }


        return certificateData;

    } catch (error) {
        console.error(`Error processing certificate ${fileName}:`, error);
        throw error;
    }
}

function getParamsRSA(cert: Certificate): PublicKeyDetailsRSA {
    const publicKeyValue = cert.subjectPublicKeyInfo.parsedKey as RSAPublicKey;
    const modulusBigInt = publicKeyValue.modulus.toBigInt();
    const modulusHex = modulusBigInt < 0n ? (-modulusBigInt).toString(16) : modulusBigInt.toString(16);
    const exponentBigInt = publicKeyValue.publicExponent.toBigInt();
    const exponentDecimal = exponentBigInt.toString();

    const modulusBytes = publicKeyValue.modulus.valueBlock.valueHexView;
    const actualBits = modulusBytes.length * 8;

    return {
        modulus: modulusHex,
        exponent: exponentDecimal,
        bits: actualBits.toString()
    };
}

function getParamsRSAPSS(cert: Certificate): PublicKeyDetailsRSAPSS {
    const { modulus, exponent, bits } = getParamsRSA(cert);
    const sigAlgParams = cert.signatureAlgorithm.algorithmParams;
    const pssParams = new RSASSAPSSParams({ schema: sigAlgParams });
    const hashAlgorithm = getFriendlyName(pssParams.hashAlgorithm.algorithmId);
    const mgf = getFriendlyName(pssParams.maskGenAlgorithm.algorithmId);

    return {
        modulus: modulus,
        exponent: exponent,
        bits: bits,
        hashAlgorithm: hashAlgorithm,
        mgf: mgf,
        saltLength: pssParams.saltLength.toString()
    };
}

export function getParamsECDSA(cert: Certificate): PublicKeyDetailsECDSA {
    try {
        const algorithmParams = cert.subjectPublicKeyInfo.algorithm.algorithmParams;
        if (!algorithmParams) {
            console.log('No algorithm params found');
            return { curve: 'Unknown', params: {} as StandardCurve, bits: 'Unknown' };
        }

        const params = asn1js.fromBER(algorithmParams.valueBeforeDecodeView).result;
        const valueBlock: any = params.valueBlock;

        if (valueBlock.value && valueBlock.value.length >= 5) {
            const curveParams: StandardCurve = {} as StandardCurve;
            // Field ID (index 1)
            const fieldId = valueBlock.value[1];
            if (fieldId && fieldId.valueBlock && fieldId.valueBlock.value) {
                const fieldType = fieldId.valueBlock.value[0];
                const prime = fieldId.valueBlock.value[1];
                //curveParams.fieldType = fieldType.valueBlock.toString();
                curveParams.p = Buffer.from(prime.valueBlock.valueHexView).toString('hex');
            }

            // Curve Coefficients (index 2)
            const curveCoefficients = valueBlock.value[2];
            if (curveCoefficients && curveCoefficients.valueBlock && curveCoefficients.valueBlock.value) {
                const a = curveCoefficients.valueBlock.value[0];
                const b = curveCoefficients.valueBlock.value[1];
                curveParams.a = Buffer.from(a.valueBlock.valueHexView).toString('hex');
                curveParams.b = Buffer.from(b.valueBlock.valueHexView).toString('hex');
            }

            // Base Point G (index 3)
            const basePoint = valueBlock.value[3];
            if (basePoint && basePoint.valueBlock) {
                curveParams.G = Buffer.from(basePoint.valueBlock.valueHexView).toString('hex');
            }

            // Order n (index 4)
            const order = valueBlock.value[4];
            if (order && order.valueBlock) {
                curveParams.n = Buffer.from(order.valueBlock.valueHexView).toString('hex');
            }

            if (valueBlock.value.length >= 6) {
                // Cofactor h (index 5)
                const cofactor = valueBlock.value[5];
                if (cofactor && cofactor.valueBlock) {
                    curveParams.h = Buffer.from(cofactor.valueBlock.valueHexView).toString('hex');
                }
            }
            else {
                curveParams.h = '01';
            }

            const identifiedCurve = identifyCurve(curveParams);
            return { curve: identifiedCurve, params: curveParams, bits: getECDSACurveBits(identifiedCurve) };
        } else {
            if (valueBlock.value) {
                console.log(valueBlock.value);
            }
            else {
                console.log('No value block found');
            }
        }
    } catch (error) {
        console.error('Error parsing EC parameters:', error);
        return { curve: 'Error', params: {} as StandardCurve, bits: 'Unknown' };
    }
}