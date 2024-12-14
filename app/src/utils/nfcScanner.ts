import { NativeModules, Platform } from 'react-native';
// @ts-ignore
import PassportReader from 'react-native-passport-reader';
import { checkInputs } from '../utils/utils';
import { PassportData } from '../../../common/src/utils/types';
import forge from 'node-forge';
import { Buffer } from 'buffer';
import * as amplitude from '@amplitude/analytics-react-native';
import useUserStore from '../stores/userStore';
import useNavigationStore from '../stores/navigationStore';

export const scan = async (setModalProofStep: (modalProofStep: number) => void) => {
  const {
    passportNumber,
    dateOfBirth,
    dateOfExpiry,
  } = useUserStore.getState()

  const { toast } = useNavigationStore.getState();

  const check = checkInputs(
    passportNumber,
    dateOfBirth,
    dateOfExpiry
  );

  if (!check.success) {
    amplitude.track('inputs_invalid', { error: check.message });
    toast.show("Unvailable", {
      message: check.message,
      customData: {
        type: "info",
      },
    })
    return;
  }

  console.log('scanning...');

  if (Platform.OS === 'android') {
    scanAndroid(setModalProofStep);
  } else {
    scanIOS(setModalProofStep);
  }
};

const scanAndroid = async (setModalProofStep: (modalProofStep: number) => void) => {
  const {
    passportNumber,
    dateOfBirth,
    dateOfExpiry,
  } = useUserStore.getState()
  const { toast, setNfcSheetIsOpen } = useNavigationStore.getState();
  setNfcSheetIsOpen(true);

  try {
    const response = await PassportReader.scan({
      documentNumber: passportNumber,
      dateOfBirth: dateOfBirth,
      dateOfExpiry: dateOfExpiry
    });
    console.log('scanned');
    setNfcSheetIsOpen(false);
    amplitude.track('nfc_scan_successful');
    handleResponseAndroid(response, setModalProofStep);
  } catch (e: any) {
    console.log('error during scan:', e);
    setNfcSheetIsOpen(false);
    amplitude.track('nfc_scan_unsuccessful', { error: e.message });
    if (e.message.includes("InvalidMRZKey")) {
      toast.show('Error', {
        message: "Go to previous screen and rescan your passport with the camera",
        customData: {
          type: "error",
        },
        timeout: 5000,
      })
      useNavigationStore.getState().setSelectedTab("scan");
    } else {
      toast.show('Error', {
        message: e.message,
        customData: {
          type: "error",
        },
      })
    }
  }
};

const scanIOS = async (setModalProofStep: (modalProofStep: number) => void) => {
  const {
    passportNumber,
    dateOfBirth,
    dateOfExpiry
  } = useUserStore.getState()
  const { toast } = useNavigationStore.getState();

  console.log('passportNumber', passportNumber);
  console.log('dateOfBirth', dateOfBirth);
  console.log('dateOfExpiry', dateOfExpiry);

  try {
    const response = await NativeModules.PassportReader.scanPassport(
      passportNumber,
      dateOfBirth,
      dateOfExpiry
    );
    console.log('scanned');
    handleResponseIOS(response, setModalProofStep);
    amplitude.track('nfc_scan_successful');
  } catch (e: any) {
    console.log('error during scan:', e);
    amplitude.track('nfc_scan_unsuccessful', { error: e.message });
    // if (!e.message.includes("UserCanceled")) {
    //   toast.show('Failed to read passport', {
    //     message: e.message,
    //     customData: {
    //       type: "error",
    //     },
    //   })
    // }
    if (e.message.includes("InvalidMRZKey")) {
      toast.show('Error', {
        message: "Go to previous screen and rescan your passport with the camera",
        customData: {
          type: "error",
        },
        timeout: 5000,
      })
      useNavigationStore.getState().setSelectedTab("scan");
    } else {
      toast.show('Error', {
        message: e.message,
        customData: {
          type: "error",
        },
      })
    }
  }
};

const handleResponseIOS = async (
  response: any,
  setModalProofStep: (modalProofStep: number) => void
) => {
  const { toast } = useNavigationStore.getState();

  const parsed = JSON.parse(response);

  const dgHashesObj = JSON.parse(parsed?.dataGroupHashes)
  const dg1HashString = dgHashesObj?.DG1?.sodHash
  const dg1Hash = Array.from(Buffer.from(dg1HashString, 'hex'))
  const dg2HashString = dgHashesObj?.DG2?.sodHash
  const dg2Hash = Array.from(Buffer.from(dg2HashString, 'hex'))

  const eContentBase64 = parsed?.eContentBase64; // this is what we call concatenatedDataHashes in android world
  const signedAttributes = parsed?.signedAttributes; // this is what we call eContent in android world
  const mrz = parsed?.passportMRZ;
  const signatureBase64 = parsed?.signatureBase64;
  console.log('dataGroupsPresent', parsed?.dataGroupsPresent)
  console.log('placeOfBirth', parsed?.placeOfBirth)
  console.log('activeAuthenticationPassed', parsed?.activeAuthenticationPassed)
  console.log('isPACESupported', parsed?.isPACESupported)
  console.log('isChipAuthenticationSupported', parsed?.isChipAuthenticationSupported)
  console.log('residenceAddress', parsed?.residenceAddress)
  console.log('passportPhoto', parsed?.passportPhoto.substring(0, 100) + '...')
  console.log('encapsulatedContentDigestAlgorithm', parsed?.encapsulatedContentDigestAlgorithm)
  console.log('documentSigningCertificate', parsed?.documentSigningCertificate)
  const pem = JSON.parse(parsed?.documentSigningCertificate).PEM.replace(/\n/g, '');
  console.log('pem', pem)

  const eContentArray = Array.from(Buffer.from(signedAttributes, 'base64'));
  const signedEContentArray = eContentArray.map(byte => byte > 127 ? byte - 256 : byte);

  const concatenatedDataHashesArray = Array.from(Buffer.from(eContentBase64, 'base64'));
  const concatenatedDataHashesArraySigned = concatenatedDataHashesArray.map(byte => byte > 127 ? byte - 256 : byte);

  const encryptedDigestArray = Array.from(Buffer.from(signatureBase64, 'base64')).map(byte => byte > 127 ? byte - 256 : byte);

  amplitude.track('nfc_response_parsed', {
    dataGroupsPresent: parsed?.dataGroupsPresent,
    eContentLength: signedEContentArray?.length,
    concatenatedDataHashesLength: concatenatedDataHashesArraySigned?.length,
    encryptedDigestLength: encryptedDigestArray?.length,
    activeAuthenticationPassed: parsed?.activeAuthenticationPassed,
    isPACESupported: parsed?.isPACESupported,
    isChipAuthenticationSupported: parsed?.isChipAuthenticationSupported,
    encapsulatedContentDigestAlgorithm: parsed?.encapsulatedContentDigestAlgorithm,
    dsc: pem,
  });

  const passportData = {
    mrz,
    dsc: pem,
    dg2Hash: dg2Hash,
    dg1Hash: dg1Hash,
    dgPresents: parsed?.dataGroupsPresent,
    eContent: concatenatedDataHashesArraySigned,
    signedAttr: signedEContentArray,
    encryptedDigest: encryptedDigestArray,
    photoBase64: "data:image/jpeg;base64," + parsed.passportPhoto,
    mockUser: false
  };

  try {
    useUserStore.getState().registerPassportData(passportData)
    useNavigationStore.getState().setSelectedTab("next");
  } catch (e: any) {
    console.log('error during parsing:', e);
    amplitude.track('error_parsing_nfc_response', { error: e.message });
    toast.show('Error', {
      message: e.message,
      customData: {
        type: "error",
      },
    })
  }
};

const handleResponseAndroid = async (
  response: any,
  setModalProofStep: (modalProofStep: number) => void
) => {
  const { toast } = useNavigationStore.getState();

  const {
    mrz,
    eContent,
    encryptedDigest,
    photo,
    digestAlgorithm,
    signerInfoDigestAlgorithm,
    digestEncryptionAlgorithm,
    LDSVersion,
    unicodeVersion,
    encapContent,
    documentSigningCertificate,
    dataGroupHashes
  } = response;

  const dgHashesObj = JSON.parse(dataGroupHashes);
  const dg1HashString = dgHashesObj["1"];
  const dg1Hash = Array.from(Buffer.from(dg1HashString, 'hex'));
  const dg2Hash = dgHashesObj["2"];
  const pem = "-----BEGIN CERTIFICATE-----" + documentSigningCertificate + "-----END CERTIFICATE-----"

  const dgPresents = Object.keys(dgHashesObj)
    .map(key => parseInt(key))
    .filter(num => !isNaN(num))
    .sort((a, b) => a - b);

  const passportData: PassportData = {
    mrz: mrz.replace(/\n/g, ''),
    dsc: pem,
    dg2Hash,
    dg1Hash,
    dgPresents,
    eContent: JSON.parse(encapContent),
    signedAttr: JSON.parse(eContent),
    encryptedDigest: JSON.parse(encryptedDigest),
    photoBase64: photo.base64,
    mockUser: false
  };

  console.log('passportData', JSON.stringify({
    ...passportData,
    photoBase64: passportData.photoBase64.substring(0, 100) + '...'
  }, null, 2));

  console.log('mrz', passportData?.mrz);
  console.log('dataGroupHashes', passportData?.eContent);
  console.log('eContent', passportData?.eContent);
  console.log('encryptedDigest', passportData?.encryptedDigest);
  console.log("photoBase64", passportData?.photoBase64.substring(0, 100) + '...')
  console.log("digestAlgorithm", digestAlgorithm)
  console.log("signerInfoDigestAlgorithm", signerInfoDigestAlgorithm)
  console.log("digestEncryptionAlgorithm", digestEncryptionAlgorithm)
  console.log("LDSVersion", LDSVersion)
  console.log("unicodeVersion", unicodeVersion)
  console.log("encapContent", encapContent)
  console.log("documentSigningCertificate", documentSigningCertificate)

  amplitude.track('nfc_response_parsed', {
    dataGroupHashesLength: passportData?.eContent?.length,
    eContentLength: passportData?.eContent?.length,
    encryptedDigestLength: passportData?.encryptedDigest?.length,
    digestAlgorithm: digestAlgorithm,
    signerInfoDigestAlgorithm: signerInfoDigestAlgorithm,
    digestEncryptionAlgorithm: digestEncryptionAlgorithm,
    dsc: pem,
    mockUser: false
  });

  try {
    await useUserStore.getState().registerPassportData(passportData)
    useNavigationStore.getState().setSelectedTab("next");
  } catch (e: any) {
    console.log('error during parsing:', e);
    amplitude.track('error_parsing_nfc_response', { error: e.message });
    toast.show('Error', {
      message: e.message,
      customData: {
        type: "error",
      },
    })
  }
};
