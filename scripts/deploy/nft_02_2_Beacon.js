const debridgeInitParams = require("../../assets/debridgeInitParams");
const { deployProxy } = require("../deploy-utils");

module.exports = async function ({ getNamedAccounts, deployments, network }) {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const networkName = network.name;

  let deNFT = (await deployments.get("DeNFT")).address;
  console.log(`Deploy NFTBeacon with args (deNFT ${deNFT})`);

  await deploy("UpgradeableBeacon", {
    from: deployer,
    args: [deNFT],
    // deterministicDeployment: true,
    log: true,
    waitConfirmations: 1,
  });
};

module.exports.tags = ['nft_02_2_Beacon'];
module.exports.dependencies = [
  '01-nft_02_1_deNFT'
];