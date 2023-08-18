const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChain, networkConfig } = require("../../helper-hardhat-config")
const { assert, expect } = require('chai')
const { toNumber} = require("ethers")

!developmentChain.includes(network.name)
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

        describe("performUpKeep", async () => {

            it("it can only run if checkUpKeep is true", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [toNumber(interval) + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const tx = await raffle.performUpkeep("0x")
                assert(tx)
            })

            it("reverts when checkupkeep is false", async () => {

                expect(raffle.performUpkeep("0x")).to.be.revertedWithCustomError(raffle, "Raffle_upKeepNotNeeded")

            })

            it("updates the raffle state, emits an event , and callback the vrf coordinator", async () => {

                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [toNumber(interval) + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const txRes = await raffle.performUpkeep("0x")
                const txReceipt = await txRes.wait(1)
                console.log(txReceipt.logs[1].args.requestId)
                const requestId = txReceipt.logs[1].args.requestId
                const raffleState = await raffle.getRaffleState()
                assert(toNumber(requestId) > 0)
                assert(toNumber(raffleState) == 1)

            })


        })

        describe("fullfillRandomness", async () => {
            beforeEach(async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [toNumber(interval) + 1])
                await network.provider.request({ method: 'evm_mine', params: [] })
            })

            it('can only be called after performUpKeep', async () => {
                raffleAddress = await raffle.getAddress()
                await expect(VRFCoordinatorV2Mock.fulfillRandomWords(0, raffleAddress)).to.be.revertedWith("nonexistent request")
                await expect(VRFCoordinatorV2Mock.fulfillRandomWords(1, raffleAddress)).to.be.revertedWith("nonexistent request")
            })

            it("pickup a winner, reset the lottery , and sends money", async () => {

                const accounts = await ethers.getSigners()
                const additionalEntrace = 3
                let winnerStartingBal
                const startingAccountIndex = 1 // deployer = 0
                for (let i = startingAccountIndex; i < startingAccountIndex + additionalEntrace; i++) {
                    const accountsConnectedRaffle = raffle.connect(accounts[i])
                    await accountsConnectedRaffle.enterRaffle({ value: raffleEntranceFee })
                }
                const startingTimestamp = await raffle.getLatestTimeStamp()
                await new Promise(async (resolve, reject) => {
                    raffle.once("WinnerPicked", async () => {
                        console.log("Event got fired...")
                        try {
                            const recentWinner = await raffle.getRecentWinner()
                            console.log(recentWinner)
                            console.log(`$account 0 : ${accounts[0].address}`)
                            console.log(`$account 1 : ${accounts[1].address}`)
                            console.log(`$account 2 : ${accounts[2].address}`)
                            console.log(`$account 3 : ${accounts[3].address}`)
                            const raffleState = await raffle.getRaffleState()
                            const winnerEndingBal = await accounts[1].provider.getBalance(accounts[1].address)
                            const endingTimestamp = await raffle.getLatestTimeStamp()
                            const numPlayers = await raffle.getNumberOfPlayer()
                            assert.equal(numPlayers.toString(), "0")
                            assert.equal(raffleState.toString(), "0")
                            assert(endingTimestamp > startingTimestamp)

                            // prize won by winner
                            const prizeWon = winnerEndingBal - winnerStartingBal
                            // prize money
                            const winnerPirze = toNumber(raffleEntranceFee) * (additionalEntrace)
                            assert.equal(prizeWon.toString(),
                                (winnerPirze + toNumber(raffleEntranceFee)).toString()
                            )

                        } catch (error) {
                            reject(error)
                        }
                        resolve()
                    })
                    try {
                        const tx = await raffle.performUpkeep("0x")
                        const txReceipt = await tx.wait(1)
                        const raffleAddress = await raffle.getAddress()
                        winnerStartingBal = await accounts[1].provider.getBalance(accounts[1].address)
                        await VRFCoordinatorV2Mock.fulfillRandomWords(txReceipt.logs[1].args.requestId, raffleAddress)
                    }
                    catch (e) {
                        console.log(e)
                    }
                })
            })
        })
    })
