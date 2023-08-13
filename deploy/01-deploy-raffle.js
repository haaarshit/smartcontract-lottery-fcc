const { network, ethers } = require("hardhat")
const { networkConfig, developmenChain } = require("../helper-hardhat-conifg")
const { verify } = require("../utils/verify")
const { toNumber } = require("ethers")

const VRF_SUB_FUND_AMOUNT = ethers.parseEther("1")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deployer } = await getNamedAccounts()
    const { deploy, log } = deployments
    const chainId = network.config.chainId
    let vrfCoordinatorV2Address, subscriptionId 

    if (chainId == 31337) {
       // create VRFV2 Subscription

        const VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        // console.log(VRFCoordinatorV2Mock)
        vrfCoordinatorV2Address = VRFCoordinatorV2Mock.runner.address
    
        // console.log(vrfCoordinatorV2Address)
        // console.log(deployer)

        // console.log(VRF2CordinatorV2Mock)
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

    if (!developmenChain.includes(network.name) && process.env.ETHERSCAN_API) {
        log("Verifying.....")
        verify(raffle.address, args)
        log("-----------------------------------------")
    }
}

module.exports.tags = ["all", "raffle"]





// VRF2CordinatorV2Mock subscription id 
// https://medium.com/coinmonks/deploying-vrf-coordinator-v2-mock-for-local-blockchain-environments-26674903e4c9


// [
//     EventLog {
//       provider: HardhatEthersProvider {
//         _hardhatProvider: [LazyInitializationProviderAdapter],
//         _networkName: 'hardhat',
//         _blockListeners: [],
//         _transactionHashListeners: Map(0) {},
//         _eventListeners: []
//       },
//       transactionHash: '0xe2e54fa918fcb57c69a8ca93997f66dc27238c775b791445a6f306f94c6d40ff',
//       blockHash: '0xc770393ed1d7fc883f56d76fb56025b734afe6ac91592850940e8f3ebb779951',
//       blockNumber: 2,
//       removed: undefined,
//       address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
//       data: '0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266',
//       topics: [
//         '0x464722b4166576d3dcbba877b999bc35cf911f4eaf434b7eba68fa113951d0bf',
//         '0x0000000000000000000000000000000000000000000000000000000000000001'
//       ],
//       index: 0,
//       transactionIndex: 0,
//       interface: Interface {
//         fragments: [Array],
//         deploy: [ConstructorFragment],
//         fallback: null,
//         receive: false
//       },
//       fragment: EventFragment {
//         type: 'event',
//         inputs: [Array],
//         name: 'SubscriptionCreated',
//         anonymous: false
//       },
//       args: Result(2) [ 1n, '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' ]
//     }
//   ]