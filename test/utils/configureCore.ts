import {
    CallProxy,
    MockDeBridgeGate,
    DeBridgeTokenDeployer,
    MockWeth,
    DeBridgeToken
} from "../../typechain-types";
import { artifacts, ethers, network, upgrades } from "hardhat";
// import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { BigNumber, Contract, ContractTransaction } from "ethers";
import SignatureVerifierJson from '../../artifacts/contracts/imports/transfers/SignatureVerifier.sol/SignatureVerifier.json';
import { deployMockContract } from "@ethereum-waffle/mock-contract";
import { AddressZero } from "@ethersproject/constants";
const debridgeInitParams = require("../../assets/debridgeInitParams");


export const deployInitParamsETH = debridgeInitParams['ETH'];
export const deployInitParamsBSC = debridgeInitParams['BSC'];

export const ETH_CHAIN_ID = 1;
export const BSC_CHAIN_ID = 56;
export const POLYGON_CHAIN_ID = 137;


export const deployAs = async (aDeployer: SignerWithAddress, contractName: string, ...args: Array<any>)
    : Promise<Contract> => {
    const factory = await ethers.getContractFactory(contractName, aDeployer);
    return factory.deploy(...args);
}

export const attachAs = async (contractAddress: string, contractName: string, ...args: Array<any>)
    : Promise<Contract> => {
    const factory = await ethers.getContractFactory(contractName);
    return factory.attach(contractAddress);
}

export const createCoreContract = async (deployer: SignerWithAddress): Promise<{ deBridgeGateETH: MockDeBridgeGate, deBridgeGateBSC: MockDeBridgeGate, mockWeth: MockWeth }> => {
    const callProxyFactory = await ethers.getContractFactory("CallProxy", deployer);
    const mockDeBridgeGateFactory = await ethers.getContractFactory("MockDeBridgeGate", deployer);
    const deBridgeTokenDeployerFactory = await ethers.getContractFactory("DeBridgeTokenDeployer", deployer);
    //const signatureVerifierFactory = await ethers.getContractFactory("SignatureVerifier", deployer);
    // const deBridgeTokenDeployerFactory = await ethers.getContractFactory("DeBridgeTokenDeployer", deployer);
    const signatureVerifierMock = await deployMockContract(deployer, SignatureVerifierJson.abi);
    await signatureVerifierMock.mock.submit.returns();


    const mockWeth = await deployAs(deployer, 'MockWeth', 'weth', 'weth') as MockWeth;
    const deBridgeToken = await deployAs(deployer, 'DeBridgeToken') as DeBridgeToken;

    // ETH
    const callProxyETH = await upgrades.deployProxy(
        callProxyFactory,
        []
    ) as CallProxy;

    const deBridgeGateETH = await upgrades.deployProxy(
        mockDeBridgeGateFactory,
        [
            0,
            signatureVerifierMock.address,
            callProxyETH.address,
            mockWeth.address,
            AddressZero,
            AddressZero,
            AddressZero,
            ETH_CHAIN_ID //overrideChainId: BigNumberish,
        ],
        {
            initializer: "initializeMock",
            kind: "transparent",
        }
    ) as MockDeBridgeGate;

    const deBridgeTokenDeployerETH = await upgrades.deployProxy(
        deBridgeTokenDeployerFactory,
        [
            deBridgeToken.address,
            deployer.address,
            deBridgeGateETH.address //_debridgeAddress
        ]
    ) as DeBridgeTokenDeployer;

    await deBridgeGateETH.setDeBridgeTokenDeployer(deBridgeTokenDeployerETH.address);


    await callProxyETH.grantRole(await callProxyETH.DEBRIDGE_GATE_ROLE(), deBridgeGateETH.address);

    await deBridgeGateETH.setChainSupport(BSC_CHAIN_ID, true, true);
    await deBridgeGateETH.setChainSupport(BSC_CHAIN_ID, true, false);
    await deBridgeGateETH.setChainSupport(POLYGON_CHAIN_ID, true, true);
    await deBridgeGateETH.setChainSupport(POLYGON_CHAIN_ID, true, false);
    await deBridgeGateETH.updateGlobalFee(deployInitParamsETH.globalFixedNativeFee, deployInitParamsETH.globalTransferFeeBps);


    // BSC
    const callProxyBSC = await upgrades.deployProxy(
        callProxyFactory,
        []
    ) as CallProxy;

    const deBridgeGateBSC = await upgrades.deployProxy(
        mockDeBridgeGateFactory,
        [
            0,
            signatureVerifierMock.address,
            callProxyBSC.address,
            mockWeth.address,
            AddressZero,
            AddressZero,
            AddressZero,
            BSC_CHAIN_ID //overrideChainId: BigNumberish,
        ],
        {
            initializer: "initializeMock",
            kind: "transparent",
        }
    ) as MockDeBridgeGate;

    const deBridgeTokenDeployerBSC = await upgrades.deployProxy(
        deBridgeTokenDeployerFactory,
        [
            deBridgeToken.address,
            deployer.address,
            deBridgeGateBSC.address //_debridgeAddress
        ]
    ) as DeBridgeTokenDeployer;

    await deBridgeGateBSC.setDeBridgeTokenDeployer(deBridgeTokenDeployerBSC.address);


    await callProxyBSC.grantRole(await callProxyBSC.DEBRIDGE_GATE_ROLE(), deBridgeGateBSC.address);

    await deBridgeGateBSC.setChainSupport(ETH_CHAIN_ID, true, true);
    await deBridgeGateBSC.setChainSupport(ETH_CHAIN_ID, true, false);
    await deBridgeGateBSC.updateGlobalFee(deployInitParamsBSC.globalFixedNativeFee, deployInitParamsBSC.globalTransferFeeBps);

    await deBridgeGateBSC.setChainSupport(POLYGON_CHAIN_ID, true, true);
    await deBridgeGateBSC.setChainSupport(POLYGON_CHAIN_ID, true, false);

    await deBridgeGateBSC.deployNewAsset(
        mockWeth.address,
        1,
        "ETH",
        "ETH",
        18,
        '0xd2b9db9c53637321ed5b4fa4010fb525a11b91b6326b95182acda52e8b7bde976aef57cf32ef556fb3764ef5ef763196a55e13c5de2613f6359906421bf4bf0c1c' //_signatures
    );

    await deBridgeGateETH.deployNewAsset(
        mockWeth.address,
        56,
        "BNB",
        "BNB",
        18,
        '0xd2b9db9c53637321ed5b4fa4010fb525a11b91b6326b95182acda52e8b7bde976aef57cf32ef556fb3764ef5ef763196a55e13c5de2613f6359906421bf4bf0c1c'
    );

    return { deBridgeGateETH, deBridgeGateBSC, mockWeth }
}