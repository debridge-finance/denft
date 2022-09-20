const debridgeInitParams = require("../../assets/debridgeInitParams");
const { deployProxy } = require("../deploy-utils");

module.exports = async function ({ getNamedAccounts, deployments, network }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const networkName = network.name;

  await deploy("DeNFT", {
    from: deployer,
    // deterministicDeployment: true,
    log: true,
    waitConfirmations: 1,
  });
};

module.exports.tags = ['nft_02_1_deNFT'];