const { ethers } = require("hardhat")

const networkConfig = {
    11155111:{
       name:"sepolia",
       vrfCoordinator:"0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
       entranceFee:ethers.parseEther("0.1"),
       gasLane :"0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
       subscriptionid:"0",
       callbackGasLimit:"500000",
       intervel:"30"
    },
    31337:{
        name:"hardhat",
        entranceFee:ethers.parseEther("0.1"),
        gasLane :"0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        callbackGasLimit:"500000",
        intervel:"30"
    }
}

const developmenChain = ["hardhat","localhost"]

module.exports = {
    networkConfig,
    developmenChain
}