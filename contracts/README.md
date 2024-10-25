# OpenPassport Contracts

Contracts for OpenPassport.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
GAS_REPORT=true npx hardhat test
npx hardhat node
npx hardhat run scripts/mint.ts
npx hardhat ignition deploy ignition/modules/Deploy_All.ts --network <network>
```

## When you run test
If you want to test in your local environment

```shell
cd ../circuits
./scripts/build_prove_circuits.sh
cd ../contracts
yarn run test:local
```

If you want to test in production environment
```shell
cd ../circuits
./scripts/download_circuits_from_aws.sh
cd ../contracts
yarn run test:prod
```

If you want to generate your own proof or when you update circuits, pls delete json files in test/integrationTest

## Deployed Addresses
These contracts are deployed on Sepolia.
| Contract Name | Address |
| --- | --- |
| GenericVerifier | 0x796E2c4e66E3984641baEDa77b267CcAD76D99bE |
| OpenPassportVerifier | 0x493f59620e9587dace89DB92CAB36eD96b1C7907 |
| Verifier_prove_rsa_65537_sha1 | 0x272956144fc77b6dFb7161230426a1823339E147 |
| Verifier_prove_rsa_65537_sha256 | 0xd89728C1211a8f239dA74B48d562c464Ee0B31fa |
| Verifier_prove_rsapss_65537_sha256 | 0xF77Be82318F11392Efb5F1062D954911d6086537 |
| Verifier_dsc_rsa_65537_sha1_4096 | 0x0F94D82657a3622E96Ff95008b61F903CF83D314 |
| Verifier_dsc_rsa_65537_sha256_4096 | 0x63792806a0384D5a51EAd3A6d278A602da2F288e |
| Verifier_dsc_rsapss_65537_sha256_4096 | 0x2FAA6D634Fe645333561F470F2507Ede45b0BE9c |