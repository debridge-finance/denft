const debridgeInitParams = require("../../assets/debridgeInitParams");
const { deployProxy, getLastDeployedProxy, waitTx } = require("../deploy-utils");

module.exports = async function ({ getNamedAccounts, deployments, network }) {
  const { deployer } = await getNamedAccounts();

  const nftBridgeInstance = await getLastDeployedProxy("DeNftBridge", deployer,);

  let deBridgeNFTDeployer = await getLastDeployedProxy("DeNftDeployer", deployer);

  console.log(`nftDeBridge setNftDeployer ${deBridgeNFTDeployer.address}`);
  tx = await nftBridgeInstance.setNftDeployer(deBridgeNFTDeployer.address);
  await waitTx(tx);
};

module.exports.tags = ["nft_04_nftConfiguration"]
module.exports.dependencies = [
  'nft_01_bridge',
  'nft_03_nftDeployer'
];
