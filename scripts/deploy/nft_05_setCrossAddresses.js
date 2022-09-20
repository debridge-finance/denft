const debridgeInitParams = require("../../assets/debridgeInitParams");
const { deployProxy, getLastDeployedProxy, waitTx } = require("../deploy-utils");

module.exports = async function ({ getNamedAccounts, deployments, network }) {
  const { deployer } = await getNamedAccounts();

  const nftBridgeInstance = await getLastDeployedProxy("DeNftBridge", deployer);

  const nftBridgeAddress = nftBridgeInstance.address; 
  // const NFTBridgeFactory = await hre.ethers.getContractFactory("DeNftBridge", deployer);
  // const nftBridgeInstance = await NFTBridgeFactory.attach(nftBridgeAddress);
  const chainIds = [1,56,137,42161,43114].filter(c=>c !=network.config.chainId);  

  for (const chainId of chainIds) {
    console.log(`addChainSupport ${nftBridgeAddress}; chainId: ${chainId}`);
    tx = await nftBridgeInstance.addChainSupport(nftBridgeAddress, chainId);
    await waitTx(tx);
  }
};

module.exports.tags = ["nft_05_setCrossAddresses"]
module.exports.dependencies = [
  'nft_01_bridge'
];
