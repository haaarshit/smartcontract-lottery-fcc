const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmenChain, networkConfig } = require("../../helper-hardhat-conifg")
const { assert, expect } = require('chai')
const { toNumber } = require("ethers")

!developmenChain.includes(network.name)
    ? describe.skip
    : describe("Raffle Test", async () => {

        let raffle, VRFCoordinatorV2Mock, raffleEntranceFee, deployer, interval
        const chainId = network.config.chainId
        beforeEach(async () => {

            deployer = (await getNamedAccounts()).deployer
            await deployments.fixture(["all"])
            raffle = await ethers.getContract("Raffle", deployer)
            VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
            raffleEntranceFee = await raffle.getEnteranceFee()
            interval = await raffle.getInterval()
        })

        describe("constructor", async () => {

            it("intilize the raffle corretlly", async () => {
                const raffleState = await raffle.getRaffleState()
                assert.equal(raffleState.toString(), "0")
                assert.equal(interval.toString(), networkConfig[chainId]["intervel"])
            })
        })

        describe("enterRaffle", async () => {

            it("It revert if you don't pay enough", async () => {
                // await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle_notEnoughEth")
                await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(raffle, "Raffle_notEnoughEth")
            })

            it("records player when they enter", async () => {
                // raffle entrence fee
                await raffle.enterRaffle({ value: raffleEntranceFee })
                const playerFromContrcact = await raffle.getPlayer(0)
                assert.equal(playerFromContrcact, deployer)
            })

            it("emits event on enter", async () => {
                await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(raffle, "RaffleEnter")
            })

            // getting error in this test
            it("does not allowed enterace when raffle is calculating", async () => {
                // will perform upkeep to change the raffleState to calculating
                await raffle.enterRaffle({ value: raffleEntranceFee })

                await network.provider.send("evm_increaseTime", [toNumber(interval) + 1])
                await network.provider.send("evm_mine", []) // mine one extra block
                // pretend to be chainlink keeper
                await raffle.performUpkeep("0x")
                await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWithCustomError(raffle, "Raffle_notOpen")
            })
        })
        
        describe("checkupkeep", () => {
            
            it("returns false if people haven't sent any ETH", async () => {
                await network.provider.send("evm_increaseTime", [toNumber(interval) + 1])
                await network.provider.send("evm_mine", [])
                const { upKeepNeeded } = await raffle.checkUpkeep("0x00")
                assert(!upKeepNeeded)
            })
            
            it("returns false if raffle isn't open", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [toNumber(interval) + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                await raffle.performUpkeep("0x") // changes the state to calculating
                const raffleState = await raffle.getRaffleState() // stores the new state
                const { upkeepNeeded } = await raffle.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                assert.equal(raffleState.toString() == "1", upkeepNeeded == false)
            })

            it("returns false if enough time hasn't passed", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [toNumber(interval) - 5]) // use a higher number here if this test fails
                await network.provider.request({ method: "evm_mine", params: [] })
                const { upkeepNeeded } = await raffle.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                assert(!upkeepNeeded)
            })

            it("returns true if enough time has passed, has players, eth, and is open", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [toNumber(interval) + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const { upkeepNeeded } = await raffle.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                assert(upkeepNeeded)
            })
        })

    })