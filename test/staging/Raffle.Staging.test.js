const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChain } = require("../../helper-hardhat-config")
const { assert, expect } = require('chai')
const { toNumber } = require("ethers")

developmentChain.includes(network.name)
    ? describe.skip
    : describe("Raffle Test", async () => {

        let raffle, raffleEntranceFee, deployer

        beforeEach(async () => {
            deployer = (await getNamedAccounts()).deployer
            raffle = await ethers.getContract("Raffle", deployer)
            raffleEntranceFee = await raffle.getEnteranceFee()
        })
        describe("fullfillRandomWords", () => {
            it("works with live chainlink keepers and chainlink VRF , we get a random winner", async () => {
                // enter the raffle

                const startingTimestamp = await raffle.getLatestTimeStamp()

                const accounts = await ethers.getSigners()
                let winnerStartingBal

                await new Promise(async (resolve, reject) => {
                    raffle.once("WinnerPicked", async () => {
                        console.log("WinnerPicked event fired...")

                        try {
                            const recentWinner = await raffle.getRecentWinner()
                            const raffleState = await raffle.getRaffleState()
                            const winnerBalance = await accounts[0].provider.getBalance(accounts[0].address)
                            const endingTimestamp = await raffle.getLatestTimeStamp()
                            await expect(raffle.getPlayer(0)).to.be.reverted
                            assert.equal(recentWinner.toString(), accounts[0].address)
                            assert.equal(raffleState, 0)
                            assert(endingTimestamp > startingTimestamp)
                            // prize won by winner
                            const prizeWon = winnerBalance - winnerStartingBal
                            // prize money
                            // const winnerPirze = toNumber(raffleEntranceFee) * (additionalEntrace)
                            assert.equal(prizeWon.toString(), (toNumber(raffleEntranceFee)).toString())
                            resolve()
                        } catch (e) {
                            console.log(e)
                            reject(e)
                        }
                    })

                    try {
                        console.log("entering raffle")
                        const tx = await raffle.enterRaffle({ value: raffleEntranceFee })
                        await tx.wait(1)
                        console.log("Ok, time to wait...")
                        winnerStartingBal = await accounts[0].provider.getBalance(accounts[0].address)
                    }
                    catch (er) {
                        console.log(er)
                    }
                })

                // setup the listner before we enter the raffle 
            })
        })
    })

    