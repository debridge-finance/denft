const debridgeInitParams = require("../../assets/debridgeInitParams");
const { deployProxy, getLastDeployedProxy } = require("../deploy-utils");

module.exports = async function ({ getNamedAccounts, deployments, network }) {
  const { deployer } = await getNamedAccounts();

  // const deBridgeGateInstance = await getLastDeployedProxy("DeBridgeGate", deployer);
  // console.log("deBridgeGateInstance ", deBridgeGateInstance.address);
  const deBridgeGateAddress = "0x43dE2d77BF8027e25dBD179B491e8d64f38398aA";

  // function initialize(
  //   DeBridgeGate _deBridgeGate
  // )
  await deployProxy("DeNftBridge", deployer,
    [
      deBridgeGateAddress
      // deBridgeGateInstance.address
    ],
    true);
};

module.exports.tags = ['nft_01_bridge'];
// module.exports.dependencies = [''];
