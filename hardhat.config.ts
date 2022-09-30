import { config as dotenvConfig } from 'dotenv-flow';
import '@typechain/hardhat'
import 'hardhat-deploy';
import '@nomiclabs/hardhat-ethers'
import '@nomicfoundation/hardhat-toolbox'
import '@nomicfoundation/hardhat-chai-matchers'
import '@openzeppelin/hardhat-upgrades';
import '@nomiclabs/hardhat-truffle5'

dotenvConfig();

module.exports = {
  networks: {
    hardhat: {
      chainId: 1
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    deploy: "./scripts/deploy"
  },
  namedAccounts: {
    deployer: 0
  },
  kovan: {
    url: "https://kovan.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    chainId: 42
  },
  bsctest: {
    url: "https://data-seed-prebsc-1-s2.binance.org:8545/",
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    chainId: 97
  },
  hecotest: {
    url: "https://http-testnet.hecochain.com/",
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    chainId: 256
  },
  arethtest: {
    url: "https://rinkeby.arbitrum.io/rpc",
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    chainId: 421611
  },
  mumbai: {
    url: "https://rpc-mumbai.maticvigil.com",
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    chainId: 80001
  },
  RINKEBY: {
    url: "https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    chainId: 4
  },
  ETH: {
    url: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    // gasPrice: 10e9,
    chainId: 1
  },
  BSC: {
    url: "https://bsc-dataseed.binance.org/",
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    gasPrice: 6e9,
    chainId: 56
  },
  HECO: {
    url: "https://http-mainnet.hecochain.com",
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    chainId: 128
  },
  MATIC: {
    url: "https://polygon-rpc.com/",
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    chainId: 137
  },
  ARBITRUM: {
    url: "https://arb1.arbitrum.io/rpc",
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    chainId: 42161
  },
  FANTOM: {
    url: "https://rpc.ftm.tools/",
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    chainId: 250
  },
  fantomTest: {
    url: "https://rpc.testnet.fantom.network/",
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    chainId: 4002
  },
  AVALANCHE: {
    url: "https://api.avax.network/ext/bc/C/rpc",
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    chainId: 43114
  },
  avalancheTest: {
    url: "https://api.avax-test.network/ext/bc/C/rpc",
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    chainId: 43113
  },
  solidity: {
    compilers: [
      {
        version: "0.8.7",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
    ]
  },
};
