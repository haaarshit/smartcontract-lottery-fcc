const { network, ethers } = require("hardhat")
const { networkConfig, developmenChain } = require("../helper-hardhat-conifg")
const { verify } = require("../utils/verify")
const { toNumber } = require("ethers")

const VRF_SUB_FUND_AMOUNT = ethers.parseEther("1")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deployer } = await getNamedAccounts()
    const { deploy, log } = deployments
    const chainId = network.config.chainId
    let vrfCoordinatorV2Address, subscriptionId , VRFCoordinatorV2Mock

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
    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if(developmenChain.includes(network.name)) {
        await VRFCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address)
        log('Consumer is added')
    }

    if (!developmenChain.includes(network.name) && process.env.ETHERSCAN_API) {
        log("Verifying.....")
        verify(raffle.address, args)
        log("-----------------------------------------")
    }
}

module.exports.tags = ["all", "raffle"]



