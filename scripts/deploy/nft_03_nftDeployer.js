const debridgeInitParams = require("../../assets/debridgeInitParams");
const { deployProxy, getLastDeployedProxy } = require("../deploy-utils");

module.exports = async function ({ getNamedAccounts, deployments, network }) {
  const { deployer } = await getNamedAccounts();

  const nftBridgeAddress = (await getLastDeployedProxy("DeNftBridge", deployer,)).address;
  const beacon = (await deployments.get("UpgradeableBeacon")).address;

  // function initialize(
  //   address _beacon,
  //   address _nftBridgeAddress
  // ) 
  await deployProxy("DeNftDeployer", deployer,
    [
      beacon,
      nftBridgeAddress
    ],
    true);
};

module.exports.tags = ["nft_03_nftDeployer"]
module.exports.dependencies = [
  '01-nft_02_1_deNFT',
  'nft_02_2_Beacon'
];
