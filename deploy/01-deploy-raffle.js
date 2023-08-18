const { network, ethers } = require("hardhat")
const { networkConfig, developmentChain } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const { toNumber } = require("ethers")

const VRF_SUB_FUND_AMOUNT = ethers.parseEther("0.01")

module.exports = async function ({ getNamedAccounts, deployments }) {
    
 
    const { deployer } = await getNamedAccounts()
    const { deploy, log } = deployments
    const chainId = network.config.chainId
    let vrfCoordinatorV2Address, subscriptionId, VRFCoordinatorV2Mock

    if (chainId == 31337) {
        // create VRFV2 Subscription

        VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = await VRFCoordinatorV2Mock.getAddress()
        const transactionResponse = await VRFCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)

        subscriptionId = transactionReceipt.logs[0].args.subId

        // Fund subscription    
        // Usually you had need the link token on a real network
        // on local network -> fund the subscrition without link token

        await VRFCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinator"]
        subscriptionId = networkConfig[chainId]["subscriptionid"]
    }


    const entranceFee = networkConfig[chainId]["entranceFee"]
    const gasLane = networkConfig[chainId]["gasLane"]
    const gasLimit = networkConfig[chainId]["callbackGasLimit"]
    const intervel = networkConfig[chainId]["intervel"]


    const args = [vrfCoordinatorV2Address, entranceFee, gasLane, subscriptionId, gasLimit, intervel]
    console.log("Going to deploy  contract")
    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    if (developmentChain.includes(network.name)) {
        await VRFCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address)
        log('Consumer is added')
    }

    if (!developmentChain.includes(network.name) && process.env.ETHERSCAN_API) {
        log("Verifying.....")
        verify(raffle.address, args)
        log("-----------------------------------------")
    }
}

module.exports.tags = ["all", "raffle"]

// const { network, ethers } = require("hardhat")
// const {
//     networkConfig,
//     developmentChain,
// } = require("../helper-hardhat-config")
// const { verify } = require("../utils/verify")

// const FUND_AMOUNT = ethers.utils.parseEther("1") // 1 Ether, or 1e18 (10^18) Wei

// module.exports = async ({ getNamedAccounts, deployments }) => {
//     const { deploy, log } = deployments
//     const { deployer } = await getNamedAccounts()
//     const chainId = network.config.chainId
//     let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock

//     if (chainId == 31337) {
//         // create VRFV2 Subscription
//         vrfCoordinatorV2Mock = await ethers.getContractAt("VRFCoordinatorV2Mock")
//         vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
//         const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
//         const transactionReceipt = await transactionResponse.wait()
//         subscriptionId = transactionReceipt.events[0].args.subId
//         // Fund the subscription
//         // Our mock makes it so we don't actually have to worry about sending fund
//         await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
//     } else {
//         vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
//         subscriptionId = networkConfig[chainId]["subscriptionId"]
//     }

//     log("----------------------------------------------------")
//     const entranceFee = networkConfig[chainId]["entranceFee"]
//     const gasLane = networkConfig[chainId]["gasLane"]
//     const gasLimit = networkConfig[chainId]["callbackGasLimit"]
//     const intervel = networkConfig[chainId]["intervel"]


//     const args = [vrfCoordinatorV2Address, entranceFee, gasLane, subscriptionId, gasLimit, intervel]
//     const raffle = await deploy("Raffle", {
//         from: deployer,
//         args: args,
//         log: true,
//         waitConfirmations: network.config.blockConfirmations || 1,
//     })

//     // Ensure the Raffle contract is a valid consumer of the VRFCoordinatorV2Mock contract.
//     if (developmentChain.includes(network.name)) {
//         const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
//         await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address)
//     }

//     // Verify the deployment
//     if (!developmentChain.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
//         log("Verifying...")
//         await verify(raffle.address, arguments)
//     }

//     log("Enter lottery with command:")
//     const networkName = network.name == "hardhat" ? "localhost" : network.name
//     log(`yarn hardhat run scripts/enterRaffle.js --network ${networkName}`)
//     log("----------------------------------------------------")
// }

// module.exports.tags = ["all", "raffle"]


