// require("@nomiclabs/hardhat-waffle")
// require("@nomiclabs/hardhat-etherscan")
require("@nomicfoundation/hardhat-toolbox")
require("@nomiclabs/hardhat-ethers")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()





const RPC_URL = process.env.RPC_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY

module.exports = {
  solidity: "0.8.7",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      chainId: 31337,
      blockConfirmations: 1,
      url: "http://localhost:8545",
    },
    sepolia: {
      chainId: 11155111,
      blockConfirmations: 1,
      url: RPC_URL,
      accounts: [PRIVATE_KEY]
    }
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    players: {
      default: 1,
    }
  },
  gasReporter: {
    enabled: false
  }
};
