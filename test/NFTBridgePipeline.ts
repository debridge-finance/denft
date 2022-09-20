import { expect } from 'chai';
import { before, test } from 'mocha';
import {
    CallProxy,
    MockDeBridgeGate,
    DeBridgeTokenDeployer,
    DeNftDeployer,
    MockERC721,
    MockWeth,
    MockDeNftBridge,
    DeNFT,
    UpgradeableBeacon,
    DeBridgeToken,
    DeBridgeGate,
    ERC721Upgradeable

} from "../typechain-types";
const {
    decodeAutoParamsTo,
    packSubmissionAutoParamsFrom
} = require("./utils.spec");
import { artifacts, ethers, network, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { BigNumber, Contract, ContractTransaction } from "ethers";
import expectEvent from "./utils/expectEventFork";
import { defaultAbiCoder } from "ethers/lib/utils";
import { SUBMISSION_AUTO_PARAMS_FROM_TYPE, SUBMISSION_AUTO_PARAMS_TO_TYPE } from "./utils/paramTypesForDecodeEncode";
import { AddressZero } from "@ethersproject/constants";
import { SentEvent } from '../typechain-types/IDeBridgeGate';
import { attachAs, BSC_CHAIN_ID, createCoreContract, deployAs, ETH_CHAIN_ID, POLYGON_CHAIN_ID } from './utils/configureCore';
import { strict } from 'assert';
import { string } from 'hardhat/internal/core/params/argumentTypes';
// import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
// const debridgeInitParams = require("../../assets/debridgeInitParams");



// const deployInitParamsETH = debridgeInitParams['ETH'];
// const deployInitParamsBSC = debridgeInitParams['BSC'];
const DENFT_TYPE_THIRDPARTY = 1;
const DENFT_TYPE_BASIC = 2;

let nftBeacon: UpgradeableBeacon;
let deNFT: DeNFT;

let nftBridgeETH: MockDeNftBridge;
let deBridgeNFTDeployerETH: DeNftDeployer;
let deBridgeGateETH: MockDeBridgeGate;

let nftBridgeBSC: MockDeNftBridge;
let deBridgeNFTDeployerBSC: DeNftDeployer;
let deBridgeGateBSC: MockDeBridgeGate;


let nftBridgeMATIC: MockDeNftBridge;
let deBridgeToken: DeBridgeToken;

let [deployer, nftDeployer, alice, tokenAdmin, fei, devid]: SignerWithAddress[] = [];

const deployAsDeployer = async (contractName: string, ...args: Array<any>)
    : Promise<Contract> => deployAs(deployer, contractName, ...args)

before(async () => {
    [deployer, nftDeployer, alice, tokenAdmin, fei, devid] = await ethers.getSigners();
    await network.provider.send('hardhat_reset');

    // configure core contracts
    const { deBridgeGateETH: _deBridgeGateETH, deBridgeGateBSC: _deBridgeGateBSC } = await createCoreContract(deployer);
    deBridgeGateETH = _deBridgeGateETH;
    deBridgeGateBSC = _deBridgeGateBSC;

    deNFT = await deployAsDeployer('DeNFT') as DeNFT;
    nftBeacon = await deployAsDeployer('UpgradeableBeacon', deNFT.address) as UpgradeableBeacon;
    // ETH
    nftBridgeETH = await upgrades.deployProxy(
        await ethers.getContractFactory("MockDeNftBridge", deployer),
        [

            deBridgeGateETH.address,
            ETH_CHAIN_ID
        ],
        {
            initializer: "initializeMock",
            kind: "transparent",
        }

    ) as MockDeNftBridge;

    deBridgeNFTDeployerETH = await upgrades.deployProxy(
        await ethers.getContractFactory("DeNftDeployer", deployer),
        [
            nftBeacon.address,
            nftBridgeETH.address
        ]

    ) as DeNftDeployer;

    await nftBridgeETH.setNftDeployer(deBridgeNFTDeployerETH.address);

    // BSC
    nftBridgeBSC = await upgrades.deployProxy(
        await ethers.getContractFactory("MockDeNftBridge", deployer),
        [

            deBridgeGateBSC.address,
            BSC_CHAIN_ID
        ],
        {
            initializer: "initializeMock",
            kind: "transparent",
        }

    ) as MockDeNftBridge;

    deBridgeNFTDeployerBSC = await upgrades.deployProxy(
        await ethers.getContractFactory("DeNftDeployer", deployer),
        [
            nftBeacon.address,
            nftBridgeBSC.address
        ]

    ) as DeNftDeployer;


    await nftBridgeBSC.setNftDeployer(deBridgeNFTDeployerBSC.address);

    nftBridgeMATIC = await upgrades.deployProxy(
        await ethers.getContractFactory("MockDeNftBridge", deployer),
        [

            deBridgeGateBSC.address,
            POLYGON_CHAIN_ID
        ],
        {
            initializer: "initializeMock",
            kind: "transparent",
        }

    ) as MockDeNftBridge;

    await nftBridgeETH.addChainSupport(nftBridgeBSC.address, BSC_CHAIN_ID);
    await nftBridgeBSC.addChainSupport(nftBridgeETH.address, ETH_CHAIN_ID);
    await nftBridgeBSC.addChainSupport(nftBridgeMATIC.address, POLYGON_CHAIN_ID);
});



describe('Check initializer', async () => {
    test('DeNftBridge initialize can be called only once', async () => {
        await expect(
            nftBridgeETH.initialize(deBridgeGateETH.address)
        ).to.be.revertedWith("Initializable: contract is already initialized");
    })
    test('DeNftDeployer initialize can be called only once', async () => {
        await expect(
            deBridgeNFTDeployerETH.initialize(nftBeacon.address, nftBridgeETH.address)
        ).to.be.revertedWith("Initializable: contract is already initialized");
    })
    test('deNFT initialize can be called only once', async () => {
        await expect(
            deNFT.initialize(tokenAdmin.address, [deployer.address], deBridgeGateETH.address, 'NAME', 'SYMBOL', "URI://")
        ).to.be.revertedWith("Initializable: contract is already initialized");
    })
    test('DeNftBridge Check correct initialize value', async () => {
        //await nftBridgeETH.initializeMock(deBridgeGateETH.address, 1);
        expect(deBridgeGateETH.address).to.equal(await nftBridgeETH.deBridgeGate(), `Incorrect set DeBridgeGate`);
        expect(ETH_CHAIN_ID).to.equal(await deBridgeGateETH.chainId(), `Incorrect set chainId`);
        expect(BSC_CHAIN_ID).to.equal(await deBridgeGateBSC.chainId(), `Incorrect set chainId`);
        expect(true).to.equal(await deBridgeGateETH.hasRole(await deBridgeGateETH.DEFAULT_ADMIN_ROLE(), deployer.address), `Incorrect set admin role`);
        expect(true).to.equal(await deBridgeGateBSC.hasRole(await deBridgeGateBSC.DEFAULT_ADMIN_ROLE(), deployer.address), `Incorrect set admin role`);
    })
    test('DeNftDeployer Check correct initialize value', async () => {
        //await deBridgeNFTDeployerETH.initialize(deNFT.address, nftBridgeETH.address, tokenAdmin.address);
        expect(nftBeacon.address).to.equal(await deBridgeNFTDeployerETH.beacons(2), `Incorrect set becon`);
        expect(nftBridgeETH.address).to.equal(await deBridgeNFTDeployerETH.nftBridgeAddress(), `Incorrect set nftBridgeAddress`);
        // expect(tokenAdmin.address).to.equal(await deBridgeNFTDeployerETH.deBridgeTokenAdmin(), `Incorrect set deBridgeTokenAdmin`);

        expect(true).to.equal(await deBridgeNFTDeployerETH.hasRole(await deBridgeNFTDeployerETH.DEFAULT_ADMIN_ROLE(), deployer.address), `Incorrect set admin role`);
        expect(true).to.equal(await deBridgeNFTDeployerBSC.hasRole(await deBridgeNFTDeployerBSC.DEFAULT_ADMIN_ROLE(), deployer.address), `Incorrect set admin role`);
    })
});
describe('Check NFTBeacon logic', async () => {
    test('Check correct initialization', async () => {
        expect(deNFT.address).to.equal(await nftBeacon.implementation(), `Token implementation was wrang set`);
    });
    test('Set new token implementation by admin', async () => {
        const newTokenImplementationTest = nftBridgeETH.address;
        const sendTx = await nftBeacon.connect(deployer).upgradeTo(newTokenImplementationTest);

        await expectEvent.inTransaction(
            sendTx.hash,
            artifacts.require('UpgradeableBeacon'),
            "Upgraded",
            {
                implementation: newTokenImplementationTest
            }
        );

        expect(newTokenImplementationTest).to.equal(await nftBeacon.implementation(), `Token implementation didn't change`);

        //Set back
        await nftBeacon.connect(deployer).upgradeTo(deNFT.address);
    });

    test('Should reject change token implementation if called by non admin', async () => {
        await expect(
            nftBeacon.connect(alice).upgradeTo("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2")
        ).to.be.revertedWithCustomError(nftBeacon, "AdminBadRole");
    });
});

describe('Check admin methods', async () => {
    // test('Should set new token admin if called by Admin', async () => {
    //     const tx = await deBridgeNFTDeployerETH.setTokenAdmin(fei.address);
    //     await expectEvent.inTransaction(
    //         tx.hash,
    //         artifacts.require('DeNftDeployer'),
    //         "UpdatedTokenAdmin",
    //         {
    //             oldTokenAdmin: tokenAdmin.address,
    //             newTokenAdmin: fei.address
    //         }
    //     );
    //     expect(fei.address).to.equal(await deBridgeNFTDeployerETH.deBridgeTokenAdmin(), `Incorrect set deBridgeTokenAdmin`);
    //     await deBridgeNFTDeployerETH.setTokenAdmin(tokenAdmin.address);
    // });

    // test('Should fail set new token admin if called by non Admin', async () => {
    //     await expect(deBridgeNFTDeployerETH.connect(alice).setTokenAdmin(fei.address)
    //     ).to.be.revertedWith("AdminBadRole()");
    // });

    test('Should remove chain support if called by Admin', async () => {
        let tx = await nftBridgeETH.removeChainSupport(BSC_CHAIN_ID);
        await expectEvent.inTransaction(
            tx.hash,
            artifacts.require('DeNftBridge'),
            "RemovedChainSupport",
            {
                chainId: BSC_CHAIN_ID.toString()
            }
        );
        const getChainInfo = await nftBridgeETH.getChainInfo(BSC_CHAIN_ID);
        // bool isSupported;
        // bytes nftBridgeAddress;
        expect(false).to.equal(getChainInfo.isSupported, `not removed chain support`);
        expect("0x").to.equal(getChainInfo.nftBridgeAddress, `not removed chain support`);
    });

    test('Should add chain support if called by Admin', async () => {
        const tx = await nftBridgeETH.addChainSupport(nftBridgeBSC.address, BSC_CHAIN_ID);
        await expectEvent.inTransaction(
            tx.hash,
            artifacts.require('DeNftBridge'),
            //AddedChainSupport(bytes bridgeAddress, uint256 chainId);
            "AddedChainSupport",
            {
                bridgeAddress: nftBridgeBSC.address.toLocaleLowerCase(),
                chainId: BSC_CHAIN_ID.toString()
            }
        );

        const getChainInfo = await nftBridgeETH.getChainInfo(BSC_CHAIN_ID);
        // bool isSupported;
        // bytes nftBridgeAddress;
        expect(true).to.equal(getChainInfo.isSupported, `not added chain support`);
        expect(nftBridgeBSC.address.toLocaleLowerCase()).to.equal(getChainInfo.nftBridgeAddress, `not added chain support`);
    });

    test('Should fail update chain support if called by non Admin', async () => {
        await expect(nftBridgeETH.connect(alice).addChainSupport(nftBridgeBSC.address, BSC_CHAIN_ID)
        ).to.be.revertedWithCustomError(nftBridgeETH, "AdminBadRole");
        await expect(nftBridgeETH.connect(alice).removeChainSupport(BSC_CHAIN_ID)
        ).to.be.revertedWithCustomError(nftBridgeETH, "AdminBadRole");
    });
});
describe('Send THIRDPARTY NFT', async () => {

    for (var i = 0; i < 2; i++) {
        let TOKEN_ID = i + 1;
        const TOKEN_URI = 'some.uri/with-id';

        let nft: MockERC721;
        let wrappedNftBSC: DeNFT;
        before(async () => {
            // Using special deployer to mitigate any issues with changing contract address because of nonce in deployer
            // e.g. when a new contract is added before this one
            nft = await deployAs(nftDeployer, 'MockERC721') as MockERC721;
            await nft.mint(deployer.address, TOKEN_ID);
            // disable approve, let the permit do its work
            // await nft.connect(deployer).approve(nftBridgeETH.address, TOKEN_ID);
            await nft.setTokenUri(TOKEN_ID, TOKEN_URI);
            // const currentChainId = parseInt(await ethers.provider.send('eth_chainId', []));
            // const autoParamsData = await encodeMint(currentChainId);
            // EXPECTED_SENT_EVENT_ARGS_FOR_FIRST_SEND.autoParams = encodeAutoParamsTo(autoParamsData);
            // EXPECTED_SENT_EVENT_ARGS_FOR_FIRST_SEND.receiver = defaultAbiCoder.encode(['bytes'], [someAddress.address]);
        })

        const prepareStateForSend = async (deBridgeGate: MockDeBridgeGate, chainIdTo: number): Promise<void> => {
            await deBridgeGate.updateAssetFixedFees(
                await deBridgeGate.getDebridgeId(await deBridgeGate.getChainId(), await deBridgeGate.weth()),
                [chainIdTo],
                [1]
            );
            await deBridgeGate.updateGlobalFee(1, 0);
        }

        test('Send nft from Eth to BSC', async () => {
            await prepareStateForSend(deBridgeGateETH, BSC_CHAIN_ID);

            // permit for 100s
            const deadline = Math.floor((new Date() as any) / 1000) + (100);
            const nonce = await (nft as any).nonces(TOKEN_ID)
            const permitSignature = await signNFTPermit(
                nft, // contract
                nftBridgeETH.address, // spender
                TOKEN_ID, // token_id
                (nonce as BigNumber).toNumber(), // nonce
                deadline, // deadline
            );

            const sendTx = await nftBridgeETH.connect(deployer).send(
                nft.address,
                TOKEN_ID,
                deadline,
                permitSignature,
                BSC_CHAIN_ID,
                deployer.address,
                0, //_executionFee
                0, //_referralCode
                { value: await deBridgeGateETH.globalFixedNativeFee() }
            );
            const chainIdFrom = await nftBridgeETH.getChainId();
            const tokendebridgeId = await nftBridgeETH["getDebridgeId(uint256,address)"](chainIdFrom, nft.address);

            // console.log(tx);
            const receiptSend = await sendTx.wait();
            // console.log(receipt);

            const sendEvent = (
                await deBridgeGateETH.queryFilter(deBridgeGateETH.filters.Sent(), receiptSend.blockNumber)
            )[0];

            expect(nftBridgeETH.address).to.equal(await nft.ownerOf(TOKEN_ID), `nft not transfered to nftBridgeETH`);

            // console.log("receiptSend", receiptSend);
            expect(BSC_CHAIN_ID).to.equal(sendEvent.args.chainIdTo, `ERROR chainIdTo`);
            expect(nftBridgeBSC.address.toLowerCase()).to.equal(sendEvent.args.receiver.toLowerCase(), `ERROR receiver`);
            expect(nftBridgeETH.address.toLowerCase()).to.equal(sendEvent.args.nativeSender.toLowerCase(), `ERROR nativeSender`);
            expect("0").to.equal(sendEvent.args.amount.toString(), `ERROR amount`);

            // executionFee: BigNumber { _hex: '0x00', _isBigNumber: true },
            // flags: BigNumber { _hex: '0x06', _isBigNumber: true },
            // fallbackAddress: '0x0000000000000000000000000000000000000080',
            // data: '0x302b89a1
            const decodedAutoParams = decodeAutoParamsTo(sendEvent.args.autoParams);
            // console.log("decodedAutoParams", decodedAutoParams);
            // console.log("deployer.address", deployer.address);
            expect("0").to.equal(decodedAutoParams[0].executionFee.toString(), `ERROR executionFee`);
            expect("6").to.equal(decodedAutoParams[0].flags.toString(), `ERROR flags`);
            expect(deployer.address.toLowerCase()).to.equal(decodedAutoParams[0].fallbackAddress.toString().toLowerCase(), `ERROR fallbackAddress`);

            // console.log("data", decodedAutoParams[0].data);
            // expect("0").to.equal(sendEvent.args.fla.toString(), `ERROR Flag`);

            // let event = receipt.events.find((x) => x.event == "Sent");
            // console.log(receiptSend);
            // event NFTContractAdded(
            //     bytes32 debridgeId,
            //     address tokenAddress,
            //     bytes nativeAddress,
            //     uint256 nativeChainId,
            //     string name,
            //     string symbol,
            //     uint256 tokenType
            // );
            await expectEvent.inTransaction(
                sendTx.hash,
                artifacts.require('DeNftBridge'),
                "NFTContractAdded",
                {
                    debridgeId: tokendebridgeId,
                    tokenAddress: nft.address,
                    nativeAddress: nft.address.toLowerCase(),
                    nativeChainId: chainIdFrom,
                    name: await nft.name(),
                    symbol: await nft.symbol(),
                    tokenType: '1'
                }
            );

            //TOOD: comment out
            // await expectEvent.inTransaction(
            //     tx.hash,
            //     artifacts.require('DeBridgeGate'),
            //     SENT_EVENT_NAME,
            //     EXPECTED_SENT_EVENT_ARGS_FOR_FIRST_SEND
            // );

            const claimTx = await debridgeGateClaim(deBridgeGateBSC, sendEvent, ETH_CHAIN_ID);
            const receiptClaim = await claimTx.wait();
            // console.log("receiptClaim", receiptClaim);

            const nftDeployedEvent = (
                await deBridgeNFTDeployerBSC.queryFilter(deBridgeNFTDeployerBSC.filters.NFTDeployed(), receiptClaim.blockNumber)
            )[0];

            //   asset: '0xEC63C9C0044323ab45A657A555bbCe01239B22C5',
            expect("Test name").to.equal(nftDeployedEvent.args.name, `ERROR nft name`);
            expect("TNFT").to.equal(nftDeployedEvent.args.symbol, `ERROR nft symbol`);
            wrappedNftBSC = await attachAs(nftDeployedEvent.args.asset, "DeNFT") as DeNFT;

            // owned of nft index 1
            const owner1 = await wrappedNftBSC.ownerOf(TOKEN_ID);
            expect(deployer.address.toLowerCase()).to.equal(owner1.toLowerCase(), `ERROR don't transfer nft to receiver`);

            expect(await nft.name()).to.equal(await wrappedNftBSC.name(), `Different Name`);
            expect(await nft.symbol()).to.equal(await wrappedNftBSC.symbol(), `Different Symbol`);

            await expectEvent.inTransaction(
                claimTx.hash,
                artifacts.require('DeNftBridge'),
                "NFTContractAdded",
                {
                    debridgeId: tokendebridgeId,
                    tokenAddress: nftDeployedEvent.args.asset,
                    nativeAddress: nft.address.toLowerCase(),
                    nativeChainId: chainIdFrom
                }
            );


        });

        test('Check state of registration NFT in deNftBridge Ethereum', async () => {
            const nativeInfo = await nftBridgeETH.getNativeInfo(nft.address);

            expect(nft.address.toLocaleLowerCase()).to.equal(nativeInfo.tokenAddress.toLocaleLowerCase(), `ERROR nativeInfo tokenAddress`);
            expect(await nft.name()).to.equal(nativeInfo.name, `ERROR nativeInfo name`);
            expect(await nft.symbol()).to.equal(nativeInfo.symbol, `ERROR nativeInfo symbol`);
            expect(ETH_CHAIN_ID.toString()).to.equal(nativeInfo.chainId, `ERROR nativeInfo chainId`);
            expect(DENFT_TYPE_THIRDPARTY.toString()).to.equal(nativeInfo.tokenType, `ERROR nativeInfo tokenType`);

            const tokendebridgeId = await nftBridgeETH["getDebridgeId(uint256,address)"](ETH_CHAIN_ID, nft.address);
            const bridgeNFTInfo = await nftBridgeETH.getBridgeNFTInfo(tokendebridgeId);

            expect(ETH_CHAIN_ID.toString()).to.equal(bridgeNFTInfo.nativeChainId, `ERROR bridgeNFTInfo nativeChainId`);
            expect(nft.address.toLocaleLowerCase()).to.equal(bridgeNFTInfo.tokenAddress.toLocaleLowerCase(), `ERROR bridgeNFTInfo tokenAddress`);
        });

        test('Check state of registration NFT in deNftBridge BSC', async () => {
            const nativeInfo = await nftBridgeETH.getNativeInfo(nft.address);

            expect(nft.address.toLocaleLowerCase()).to.equal(nativeInfo.tokenAddress.toLocaleLowerCase(), `ERROR nativeInfo tokenAddress`);
            expect(await nft.name()).to.equal(nativeInfo.name, `ERROR nativeInfo name`);
            expect(await nft.symbol()).to.equal(nativeInfo.symbol, `ERROR nativeInfo symbol`);
            expect(ETH_CHAIN_ID.toString()).to.equal(nativeInfo.chainId, `ERROR nativeInfo chainId`);
            expect(DENFT_TYPE_THIRDPARTY.toString()).to.equal(nativeInfo.tokenType, `ERROR nativeInfo tokenType`);

            const tokendebridgeId = await nftBridgeBSC["getDebridgeId(uint256,address)"](ETH_CHAIN_ID, nft.address);
            const bridgeNFTInfo = await nftBridgeBSC.getBridgeNFTInfo(tokendebridgeId);

            expect(ETH_CHAIN_ID.toString()).to.equal(bridgeNFTInfo.nativeChainId, `ERROR bridgeNFTInfo nativeChainId`);
            expect(wrappedNftBSC.address.toLocaleLowerCase()).to.equal(bridgeNFTInfo.tokenAddress.toLocaleLowerCase(), `ERROR bridgeNFTInfo tokenAddress`);
        });

        if (i == 0) {
            test('send from BSC to MATIC', async () => {
                await prepareStateForSend(deBridgeGateBSC, POLYGON_CHAIN_ID);
                const tokendebridgeId = await nftBridgeETH["getDebridgeId(uint256,address)"](await nftBridgeETH.getChainId(), nft.address);
                const deNftTokenAddress = (await nftBridgeBSC.getBridgeNFTInfo(tokendebridgeId)).tokenAddress;
                const deNftToken = nft.attach(deNftTokenAddress)
                await deNftToken.connect(deployer)
                    .approve(nftBridgeBSC.address, TOKEN_ID);
                const tx = await nftBridgeBSC.connect(deployer).send(
                    deNftTokenAddress,
                    TOKEN_ID,
                    0,
                    "0x",
                    POLYGON_CHAIN_ID,
                    deployer.address,
                    0, //_executionFee
                    0, //_referralCode
                    { value: await deBridgeGateBSC.globalFixedNativeFee() }
                );


                // console.log(tx);
                const receiptSend = await tx.wait();
                // console.log(receipt);

                const sendEvent = (
                    await deBridgeGateBSC.queryFilter(deBridgeGateBSC.filters.Sent(), receiptSend.blockNumber)
                )[0];

                // console.log(sendEvent);
                expect(POLYGON_CHAIN_ID).to.equal(sendEvent.args.chainIdTo, `ERROR chainIdTo`);
                expect(nftBridgeMATIC.address.toLowerCase()).to.equal(sendEvent.args.receiver.toLowerCase(), `ERROR receiver`);
                expect(nftBridgeBSC.address.toLowerCase()).to.equal(sendEvent.args.nativeSender.toLowerCase(), `ERROR nativeSender`);
                expect("0").to.equal(sendEvent.args.amount.toString(), `ERROR amount`);

                // executionFee: BigNumber { _hex: '0x00', _isBigNumber: true },
                // flags: BigNumber { _hex: '0x06', _isBigNumber: true },
                // fallbackAddress: '0x0000000000000000000000000000000000000080',
                // data: '0x302b89a1
                const decodedAutoParams = decodeAutoParamsTo(sendEvent.args.autoParams);
                // console.log("decodedAutoParams", decodedAutoParams);
                // console.log("deployer.address", deployer.address);
                expect("0").to.equal(decodedAutoParams[0].executionFee.toString(), `ERROR executionFee`);
                expect("6").to.equal(decodedAutoParams[0].flags.toString(), `ERROR flags`);
                expect(deployer.address.toLowerCase()).to.equal(decodedAutoParams[0].fallbackAddress.toString().toLowerCase(), `ERROR fallbackAddress`);


                const burnEvent = (
                    await deNftToken.queryFilter(deNftToken.filters.Transfer(), receiptSend.blockNumber)
                )[0];

                expect(deployer.address.toLocaleLowerCase()).to.equal(burnEvent.args.from.toLocaleLowerCase(), `ERROR burn from`);
                expect(AddressZero).to.equal(burnEvent.args.to, `ERROR burn to`);
                expect(TOKEN_ID).to.equal(burnEvent.args.tokenId, `ERROR burn tokenId`);



                // console.log("data", decodedAutoParams[0].data);
            });
        }
        else {
            let currentSentEvent;
            test(`Send back NFT from BSC to ETH (lock/mint flow)`, async () => {
                await wrappedNftBSC.connect(deployer).approve(nftBridgeBSC.address, TOKEN_ID);
                const lastNonce = await nftBridgeBSC.nonce();
                const sendTx = await nftBridgeBSC.connect(deployer).send(
                    wrappedNftBSC.address,
                    TOKEN_ID,
                    0,
                    "0x",
                    ETH_CHAIN_ID,
                    deployer.address,
                    0, //_executionFee
                    0, //_referralCode
                    { value: await deBridgeGateBSC.globalFixedNativeFee() }
                );

                const receiptSend = await sendTx.wait();

                const burnEvent = (
                    await wrappedNftBSC.queryFilter(wrappedNftBSC.filters.Transfer(), receiptSend.blockNumber)
                )[0];

                expect(deployer.address.toLocaleLowerCase()).to.equal(burnEvent.args.from.toLocaleLowerCase(), `ERROR burn from`);
                expect(AddressZero).to.equal(burnEvent.args.to, `ERROR burn to`);
                expect(TOKEN_ID).to.equal(burnEvent.args.tokenId, `ERROR burn tokenId`);

                const nftSentEvent = (
                    await nftBridgeBSC.queryFilter(nftBridgeBSC.filters.NFTSent(), receiptSend.blockNumber)
                )[0];
                expect(wrappedNftBSC.address.toLocaleLowerCase()).to.equal(nftSentEvent.args.tokenAddress.toLocaleLowerCase(), `ERROR NFTSent tokenAddress`);
                expect(TOKEN_ID).to.equal(nftSentEvent.args.tokenId, `ERROR NFTSent tokenId`);
                expect(deployer.address.toLocaleLowerCase()).to.equal(nftSentEvent.args.receiver.toLocaleLowerCase(), `ERROR receiver tokenAddress`);
                expect(ETH_CHAIN_ID).to.equal(nftSentEvent.args.chainIdTo, `ERROR NFTSent chainIdTo`);
                expect(lastNonce).to.equal(nftSentEvent.args.nonce, `ERROR NFTSent nonce`);

                const sendEvent = (
                    await deBridgeGateBSC.queryFilter(deBridgeGateBSC.filters.Sent(), receiptSend.blockNumber)
                )[0];
                currentSentEvent = sendEvent;
            });
            test(`Claim deNFT in ETH (burn/mint flow)`, async () => {
                const claimTx = await debridgeGateClaim(deBridgeGateETH, currentSentEvent, BSC_CHAIN_ID);
                const receiptClaim = await claimTx.wait();

                // owned of nft
                const nftOwner = await nft.ownerOf(TOKEN_ID);
                expect(deployer.address.toLowerCase()).to.equal(nftOwner.toLowerCase(), `ERROR don't transfer nft to receiver`);
            });
        }
        // const getDeployedDeNft = async (): Promise<CrossChainNFT> => {
        //     const deBridgeIdOfSentNft = await nftBridge["getDebridgeId(uint256,address)"](CHAIN_ID_FROM_IN_CLAIM, nft.address);
        //     const deployedDeNftAddress = (await nftBridge.debridgeIdToDebridgeInfo(deBridgeIdOfSentNft)).tokenAddressOnCurrentChain;
        //     return new Contract(deployedDeNftAddress, CrossChainNFTAbi, deployer) as CrossChainNFT;
        // }



        // test('claim', async () => {
        //     await prepareStateForSend(CHAIN_ID_TO_IN_SENT);
        //     await nftBridge.send(
        //         nft.address,
        //         TOKEN_ID,
        //         CHAIN_ID_TO_IN_SENT,
        //         deployer.address,
        //         0, //_executionFee
        //         0, //_referralCode
        //         { value: await deBridgeGate.globalFixedNativeFee() }
        //     );

        //     const tx = await claim();

        //     await expectEvent.inTransaction(tx.hash, artifacts.require('DeBridgeGate'), CLAIMED_EVENT_NAME);
        //     await expectEvent.inTransaction(tx.hash, artifacts.require('DeNftDeployer'), DE_BRIDGE_NFT_DEPLOYED_EVENT_NAME);
        //     await expectEvent.inTransaction(tx.hash, artifacts.require('DeNftBridge'), NFT_CONTRACT_ADDED_EVENT_NAME);

        //     const deployedDeNft = await getDeployedDeNft();
        //     expect(await deployedDeNft.ownerOf(TOKEN_ID)).to.equal(deployer.address);
        //     expect(await deployedDeNft.tokenURI(TOKEN_ID)).to.equal(TOKEN_URI);
        // });

        // test('send back', async () => {
        //     const chainIdTo = CHAIN_ID_FROM_IN_CLAIM;

        //     await prepareStateForSend(CHAIN_ID_TO_IN_SENT);
        //     await nftBridge.send(
        //         nft.address,
        //         TOKEN_ID,
        //         CHAIN_ID_TO_IN_SENT,
        //         deployer.address,
        //         0, //_executionFee
        //         0, //_referralCode
        //         { value: await deBridgeGate.globalFixedNativeFee() }
        //     );

        //     await prepareStateForSend(chainIdTo);
        //     await claim();

        //     const deployedDeNft = await getDeployedDeNft();
        //     const tx = await nftBridge.send(
        //         deployedDeNft.address,
        //         TOKEN_ID,
        //         chainIdTo,
        //         deployer.address,
        //         0, //_executionFee
        //         0, //_referralCode
        //         { value: await deBridgeGate.globalFixedNativeFee() }
        //     );
        //     const claimEncoded = nftBridge.interface.encodeFunctionData('claim', [
        //         nft.address,
        //         TOKEN_ID,
        //         deployer.address
        //     ]);

        //     const expectedSentEventArgs = {
        //         ...EXPECTED_SENT_EVENT_ARGS_FOR_FIRST_SEND,
        //         nonce: '1',
        //         // copy-paste from console
        //         chainIdTo: chainIdTo.toString(),
        //         autoParams: encodeAutoParamsTo(claimEncoded),
        //     }

        //     // await expectEvent.inTransaction(
        //     //     tx.hash,
        //     //     artifacts.require('DeBridgeGate'),
        //     //     SENT_EVENT_NAME,
        //     //     expectedSentEventArgs
        //     // );
        // })
    }
});



describe('CreateNFT', async () => {
    const TOKEN_ID = 1;
    const TOKEN_BASE_URI = 'some.uri/with-id';
    const TOKEN_NAME = "NAME";
    const TOKEN_SYMBOL = "SYMBOL";

    let currentNftETH: DeNFT;
    let wrappedNftBSC: DeNFT;
    let currentSentEvent: SentEvent;
    before(async () => {
    })

    test('Create DENFT_TYPE_BASIC NFT in Ethereum', async () => {
        const createNftTx = await nftBridgeETH.createNFT(
            DENFT_TYPE_BASIC,
            deployer.address, //owner
            [deployer.address, nftBridgeETH.address], //minters
            TOKEN_NAME,
            TOKEN_SYMBOL,
            TOKEN_BASE_URI);

        const receiptCreateNft = await createNftTx.wait();
        const nftDeployedEvent = (
            await deBridgeNFTDeployerETH.queryFilter(deBridgeNFTDeployerETH.filters.NFTDeployed(), receiptCreateNft.blockNumber)
        )[0];

        expect(TOKEN_NAME).to.equal(nftDeployedEvent.args.name, `ERROR nft name`);
        expect(TOKEN_SYMBOL).to.equal(nftDeployedEvent.args.symbol, `ERROR nft symbol`);
        currentNftETH = await attachAs(nftDeployedEvent.args.asset, "DeNFT") as DeNFT;

        const tokendebridgeId = await nftBridgeETH["getDebridgeId(uint256,address)"](ETH_CHAIN_ID, currentNftETH.address);
        await expectEvent.inTransaction(
            createNftTx.hash,
            artifacts.require('DeNftBridge'),
            "NFTContractAdded",
            {
                debridgeId: tokendebridgeId,
                tokenAddress: currentNftETH.address,
                nativeAddress: currentNftETH.address.toLowerCase(),
                nativeChainId: ETH_CHAIN_ID.toString(),
                name: TOKEN_NAME,
                symbol: TOKEN_SYMBOL,
                tokenType: DENFT_TYPE_BASIC.toString()
            }
        );
    });
    test('DeNFT. Check correct set init values ', async () => {
        expect(TOKEN_NAME).to.equal(await currentNftETH.name(), `ERROR nft name`);
        expect(TOKEN_SYMBOL).to.equal(await currentNftETH.symbol(), `ERROR nft symbol`);

        expect(deployer.address).to.equal(await currentNftETH.minters(0), `ERROR set minter`);
        expect(nftBridgeETH.address).to.equal(await currentNftETH.minters(1), `ERROR set minter`);
        expect(deployer.address).to.equal(await currentNftETH.owner(), `ERROR set owner`);
    })
    test('Check state of registration NFT in deNftBridge', async () => {
        expect(DENFT_TYPE_BASIC).to.equal(await nftBridgeETH.factoryCreatedTokens(currentNftETH.address), `ERROR factory registration`);

        const nativeInfo = await nftBridgeETH.getNativeInfo(currentNftETH.address);

        expect(currentNftETH.address.toLocaleLowerCase()).to.equal(nativeInfo.tokenAddress.toLocaleLowerCase(), `ERROR nativeInfo tokenAddress`);
        expect(TOKEN_NAME).to.equal(nativeInfo.name, `ERROR nativeInfo name`);
        expect(TOKEN_SYMBOL).to.equal(nativeInfo.symbol, `ERROR nativeInfo symbol`);
        expect(ETH_CHAIN_ID.toString()).to.equal(nativeInfo.chainId, `ERROR nativeInfo chainId`);
        expect(DENFT_TYPE_BASIC.toString()).to.equal(nativeInfo.tokenType, `ERROR nativeInfo tokenType`);

        const tokendebridgeId = await nftBridgeETH["getDebridgeId(uint256,address)"](ETH_CHAIN_ID, currentNftETH.address);
        const bridgeNFTInfo = await nftBridgeETH.getBridgeNFTInfo(tokendebridgeId);

        expect(ETH_CHAIN_ID.toString()).to.equal(bridgeNFTInfo.nativeChainId, `ERROR bridgeNFTInfo nativeChainId`);
        expect(currentNftETH.address.toLocaleLowerCase()).to.equal(bridgeNFTInfo.tokenAddress.toLocaleLowerCase(), `ERROR bridgeNFTInfo tokenAddress`);
    });
    test('deNFT. initialize can be called only once', async () => {
        await expect(
            currentNftETH.initialize(tokenAdmin.address, [deployer.address], deBridgeGateETH.address, 'NAME', 'SYMBOL', "URI://")
        ).to.be.revertedWith("Initializable: contract is already initialized");
    })



    test('deNFT. Add minter', async () => {
        const countMinters = await currentNftETH.getMintersLength();
        currentNftETH.addMinter(fei.address);
        expect(fei.address).to.equal(await currentNftETH.minters(countMinters.toNumber()), `minter node added`);
        expect(countMinters.toNumber() + 1).to.equal(await currentNftETH.getMintersLength(), `error minter's count`);
        expect(true).to.equal(await currentNftETH.hasMinterAccess(fei.address), `new minter doesn't have minter rights`);
    })

    test('deNFT. Remove minter', async () => {
        const countMinters = await currentNftETH.getMintersLength();
        currentNftETH.revokeMinter(fei.address);
        expect(countMinters.toNumber() - 1).to.equal(await currentNftETH.getMintersLength(), `error minter's count`);
        expect(false).to.equal(await currentNftETH.hasMinterAccess(fei.address), `old minter has minter rights`);
    })

    test('deNFT. add/remove minter can be called by owner only', async () => {
        await expect(
            currentNftETH.connect(alice).revokeMinter(fei.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");

        await expect(
            currentNftETH.connect(alice).addMinter(fei.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");

        await expect(
            currentNftETH.connect(alice).revokeOwnerAndMinters()
        ).to.be.revertedWith("Ownable: caller is not the owner");
    })

    test('Minter can mint new NFT', async () => {
        await currentNftETH.connect(deployer).mint(deployer.address, TOKEN_ID, "tokenURI");
        expect(deployer.address.toString()).to.equal(await currentNftETH.ownerOf(TOKEN_ID), `ERROR not minted`);
    })

    for (var i = 0; i < 2; i++) {
        test(`Repeat ${i}. Send deNFT from ETH to BSC (burn/mint flow)`, async () => {
            await currentNftETH.connect(deployer).approve(nftBridgeETH.address, TOKEN_ID);
            const lastNonce = await nftBridgeETH.nonce();
            const sendTx = await nftBridgeETH.connect(deployer).send(
                currentNftETH.address,
                TOKEN_ID,
                0,
                "0x",
                BSC_CHAIN_ID,
                deployer.address,
                0, //_executionFee
                0, //_referralCode
                { value: await deBridgeGateBSC.globalFixedNativeFee() }
            );

            const receiptSend = await sendTx.wait();

            const burnEvent = (
                await currentNftETH.queryFilter(currentNftETH.filters.Transfer(), receiptSend.blockNumber)
            )[0];

            expect(deployer.address.toLocaleLowerCase()).to.equal(burnEvent.args.from.toLocaleLowerCase(), `ERROR burn from`);
            expect(AddressZero).to.equal(burnEvent.args.to, `ERROR burn to`);
            expect(TOKEN_ID).to.equal(burnEvent.args.tokenId, `ERROR burn tokenId`);

            const nftSentEvent = (
                await nftBridgeETH.queryFilter(nftBridgeETH.filters.NFTSent(), receiptSend.blockNumber)
            )[0];
            expect(currentNftETH.address.toLocaleLowerCase()).to.equal(nftSentEvent.args.tokenAddress.toLocaleLowerCase(), `ERROR NFTSent tokenAddress`);
            expect(TOKEN_ID).to.equal(nftSentEvent.args.tokenId, `ERROR NFTSent tokenId`);
            expect(deployer.address.toLocaleLowerCase()).to.equal(nftSentEvent.args.receiver.toLocaleLowerCase(), `ERROR receiver tokenAddress`);
            expect(BSC_CHAIN_ID).to.equal(nftSentEvent.args.chainIdTo, `ERROR NFTSent chainIdTo`);
            expect(lastNonce).to.equal(nftSentEvent.args.nonce, `ERROR NFTSent nonce`);


            const sendEvent = (
                await deBridgeGateETH.queryFilter(deBridgeGateETH.filters.Sent(), receiptSend.blockNumber)
            )[0];
            currentSentEvent = sendEvent;
        });
        test(`Repeat ${i}. Claim deNFT in BSC (burn/mint flow)`, async () => {
            const claimTx = await debridgeGateClaim(deBridgeGateBSC, currentSentEvent, ETH_CHAIN_ID);
            const receiptClaim = await claimTx.wait();

            //  emit NFTMinted(tokenAddress, _tokenId, _receiver, _tokenUri);
            const nftMinteddEvent = (
                await nftBridgeBSC.queryFilter(nftBridgeBSC.filters.NFTMinted(), receiptClaim.blockNumber)
            )[0];
            const mintedTokenAddress = nftMinteddEvent.args.tokenAddress;

            wrappedNftBSC = await attachAs(mintedTokenAddress, "DeNFT") as DeNFT;
            // owned of nft index 1
            const owner1 = await wrappedNftBSC.ownerOf(TOKEN_ID);
            expect(deployer.address.toLowerCase()).to.equal(owner1.toLowerCase(), `ERROR don't transfer nft to receiver`);

            expect(TOKEN_NAME).to.equal(await wrappedNftBSC.name(), `Different Name`);
            expect(TOKEN_SYMBOL).to.equal(await wrappedNftBSC.symbol(), `Different Symbol`);

            // if nft transfer first time
            if (i == 0) {
                const nftDeployedEvent = (
                    await deBridgeNFTDeployerBSC.queryFilter(deBridgeNFTDeployerBSC.filters.NFTDeployed(), receiptClaim.blockNumber)
                )[0];

                expect(TOKEN_NAME).to.equal(nftDeployedEvent.args.name, `ERROR nft name`);
                expect(TOKEN_SYMBOL).to.equal(nftDeployedEvent.args.symbol, `ERROR nft symbol`);

                const tokendebridgeId = await nftBridgeETH["getDebridgeId(uint256,address)"](ETH_CHAIN_ID, currentNftETH.address);
                await expectEvent.inTransaction(
                    claimTx.hash,
                    artifacts.require('DeNftBridge'),
                    "NFTContractAdded",
                    {
                        debridgeId: tokendebridgeId,
                        tokenAddress: nftDeployedEvent.args.asset,
                        nativeAddress: currentNftETH.address.toLowerCase(),
                        nativeChainId: ETH_CHAIN_ID.toString()
                    }
                );
            }
        });
        test(`Repeat ${i}. Check state of registration NFT in deNftBridge BSC`, async () => {
            const nativeInfo = await nftBridgeBSC.getNativeInfo(wrappedNftBSC.address);

            expect(currentNftETH.address.toLocaleLowerCase()).to.equal(nativeInfo.tokenAddress.toLocaleLowerCase(), `ERROR nativeInfo tokenAddress`);
            expect(TOKEN_NAME).to.equal(nativeInfo.name, `ERROR nativeInfo name`);
            expect(TOKEN_SYMBOL).to.equal(nativeInfo.symbol, `ERROR nativeInfo symbol`);
            expect(ETH_CHAIN_ID.toString()).to.equal(nativeInfo.chainId, `ERROR nativeInfo chainId`);
            expect(DENFT_TYPE_BASIC.toString()).to.equal(nativeInfo.tokenType, `ERROR nativeInfo tokenType`);

            const tokendebridgeId = await nftBridgeBSC["getDebridgeId(uint256,address)"](ETH_CHAIN_ID, currentNftETH.address);
            const bridgeNFTInfo = await nftBridgeBSC.getBridgeNFTInfo(tokendebridgeId);

            expect(ETH_CHAIN_ID.toString()).to.equal(bridgeNFTInfo.nativeChainId, `ERROR bridgeNFTInfo nativeChainId`);
            expect(wrappedNftBSC.address.toLocaleLowerCase()).to.equal(bridgeNFTInfo.tokenAddress.toLocaleLowerCase(), `ERROR bridgeNFTInfo tokenAddress`);
        });

        test(`Repeat ${i}. Send back deNFT from BSC to ETH (burn/mint flow)`, async () => {
            await wrappedNftBSC.connect(deployer).approve(nftBridgeBSC.address, TOKEN_ID);
            const lastNonce = await nftBridgeBSC.nonce();
            const sendTx = await nftBridgeBSC.connect(deployer).send(
                wrappedNftBSC.address,
                TOKEN_ID,
                0,
                "0x",
                ETH_CHAIN_ID,
                deployer.address,
                0, //_executionFee
                0, //_referralCode
                { value: await deBridgeGateBSC.globalFixedNativeFee() }
            );

            const receiptSend = await sendTx.wait();

            const burnEvent = (
                await wrappedNftBSC.queryFilter(wrappedNftBSC.filters.Transfer(), receiptSend.blockNumber)
            )[0];

            expect(deployer.address.toLocaleLowerCase()).to.equal(burnEvent.args.from.toLocaleLowerCase(), `ERROR burn from`);
            expect(AddressZero).to.equal(burnEvent.args.to, `ERROR burn to`);
            expect(TOKEN_ID).to.equal(burnEvent.args.tokenId, `ERROR burn tokenId`);

            const nftSentEvent = (
                await nftBridgeBSC.queryFilter(nftBridgeBSC.filters.NFTSent(), receiptSend.blockNumber)
            )[0];
            expect(wrappedNftBSC.address.toLocaleLowerCase()).to.equal(nftSentEvent.args.tokenAddress.toLocaleLowerCase(), `ERROR NFTSent tokenAddress`);
            expect(TOKEN_ID).to.equal(nftSentEvent.args.tokenId, `ERROR NFTSent tokenId`);
            expect(deployer.address.toLocaleLowerCase()).to.equal(nftSentEvent.args.receiver.toLocaleLowerCase(), `ERROR receiver tokenAddress`);
            expect(ETH_CHAIN_ID).to.equal(nftSentEvent.args.chainIdTo, `ERROR NFTSent chainIdTo`);
            expect(lastNonce).to.equal(nftSentEvent.args.nonce, `ERROR NFTSent nonce`);

            const sendEvent = (
                await deBridgeGateBSC.queryFilter(deBridgeGateBSC.filters.Sent(), receiptSend.blockNumber)
            )[0];
            currentSentEvent = sendEvent;
        });
        test(`Repeat ${i}. Claim deNFT in ETH (burn/mint flow)`, async () => {
            const claimTx = await debridgeGateClaim(deBridgeGateETH, currentSentEvent, BSC_CHAIN_ID);
            const receiptClaim = await claimTx.wait();

            // owned of nft index 1
            const owner1 = await currentNftETH.ownerOf(TOKEN_ID);
            expect(deployer.address.toLowerCase()).to.equal(owner1.toLowerCase(), `ERROR don't transfer nft to receiver`);
        });
    }

    test('deNFT. Revoke owner and minters', async () => {
        currentNftETH.revokeOwnerAndMinters();
        expect(nftBridgeETH.address).to.equal(await currentNftETH.minters(0), `first minter must be nftBridge address`);
        expect(AddressZero).to.equal(await currentNftETH.owner(), `owner didn't revoked`);
        expect(1).to.equal(await currentNftETH.getMintersLength(), `error minter's count`);
    })

});


const signNFTPermit = async (nft: MockERC721, spender: string, tokenId: number, nonce: number, deadline: number): Promise<string> => {
    const typedData = {
        types: {
            Permit: [
                { name: 'spender', type: 'address' },
                { name: 'tokenId', type: 'uint256' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
            ],
        },
        primaryType: 'Permit',
        domain: {
            name: await nft.name(),
            version: '1',
            chainId: parseInt(await ethers.provider.send('eth_chainId', [])),
            verifyingContract: nft.address,
        },
        message: {
            spender,
            tokenId,
            nonce,
            deadline,
        },
    };

    // console.log(typedData)

    // sign Permit
    const signature = await deployer._signTypedData(
        typedData.domain,
        { Permit: typedData.types.Permit },
        typedData.message,
    );

    return signature;
}

const debridgeGateClaim = async (deBridgeGate: DeBridgeGate, sendEvent: SentEvent, chainIdFrom: number): Promise<ContractTransaction> => {
    const SOME_SIGNATURES_THAT_WILL_BE_ACCEPTED_BY_SIGNATURE_VERIFIER_MOCK = '0x1234567890';
    const decodedAutoParams = decodeAutoParamsTo(sendEvent.args.autoParams);

    //executionFee, flags, fallbackAddress, data, nativeSender
    const encodedAutoParamsTo = packSubmissionAutoParamsFrom(
        decodedAutoParams[0].executionFee,
        decodedAutoParams[0].flags,
        decodedAutoParams[0].fallbackAddress,
        decodedAutoParams[0].data,
        sendEvent.args.nativeSender);

    return deBridgeGate.claim(
        sendEvent.args.debridgeId, //_debridgeId
        sendEvent.args.amount, //_amount
        chainIdFrom, //_chainIdFrom
        sendEvent.args.receiver,  //_receiver
        sendEvent.args.nonce, //_nonce
        SOME_SIGNATURES_THAT_WILL_BE_ACCEPTED_BY_SIGNATURE_VERIFIER_MOCK, //_signatures
        encodedAutoParamsTo //_autoParams
    );
}

// const encodeAutoParamsTo = (data: string): string => defaultAbiCoder.encode(
//     [SUBMISSION_AUTO_PARAMS_TO_TYPE],
//     [{ executionFee: 0, flags: 0, fallbackAddress: AddressZero, data, }]
// );

// const encodeAutoParamsFrom = async (
//     nftNativeChainId: number
// ): Promise<string> => {
//     // REVERT_IF_EXTERNAL_FAIL && PROXY_WITH_SENDER, see Flags.sol
//     const flags = parseInt('110', 2);
//     return defaultAbiCoder.encode(
//         [SUBMISSION_AUTO_PARAMS_FROM_TYPE],
//         [[0, flags, AddressZero, await encodelaimOrMint(nftNativeChainId), deployer.address]]
//     );
// };

// const encodelaimOrMint = async (
//     tokenId: number,
//     receiver: string,
//     tokenType: number,
//     nftNativeChainId: number,
//     nft: DeNFT
//     // NativeNFTInfo: NativeNFTInfo,

// ): Promise<string> => nftBridgeETH.interface.encodeFunctionData('claimOrMint', [
//     tokenId,
//     receiver,
//     await nft.tokenURI(tokenId),
//     {
//         "tokenType": tokenType,
//         "chainId": nftNativeChainId,
//         "tokenAddress": nft.address,
//         "name": await nft.name(),
//         "symbol": await nft.symbol()
//     }
// ]);