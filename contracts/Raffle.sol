// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

// import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
// import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";
// import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";

error Raffle_notEnoughEth();
error Raffle_TransferFailed();
error Raffle_notOpen();
error Raffle_upKeepNotNeeded(uint256, uint256, uint256, uint256, uint256, bool);

/**
 * @title A sample Raffle Contrcat
 * @author Harshit Tripathi
 * @notice This contract is for creating an uuntemperable decentralized smart contract
 * @dev This implements chianlink VRF2 and chainlink automation
 */

contract Raffle is VRFConsumerBaseV2,ConfirmedOwner,AutomationCompatibleInterface {
    // type declaration
    enum RaffleState {
        OPEN,
        CALCULATING
    } // uint256 0= OPEN  1 = CALCULATING

    // state variable
    uint256 private immutable s_enterenceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint32 private constant numWords = 1;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant requestConfirmations = 3;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;
    // lottery variables
    address private s_recentWinner;
    RaffleState private s_raffleState;

    /* Events */
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    // contructor
    constructor(
        address vrfCoordinatorV2,
        uint256 enterenceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) ConfirmedOwner(msg.sender){
        s_enterenceFee = enterenceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    // Fucntions
    // public functions
    function enterRaffle() public payable {
        // require msg.value > s_enteranceFee
        if (msg.value < s_enterenceFee) {
            revert Raffle_notEnoughEth();
        }
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle_notOpen();
        }
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
        // emmit event when we update our dynamic array
        // Named events with the fuction name reversed
    }

    /**
     *@dev this is function that the chainlink keeper nodes call
     * they look for `upkeepNeeded` to return true
     * Following should be true in order to return true
     * 1. Our time interval should have passed
     * 2. The lottery should have at least 1 player , and have some ETH
     * 3. Subscription is funded with LINK
     * 4. Lottery should be in an "open" state (create some state variable that will tell us wheather a lottery is open or not)
     */
    function checkUpkeep(
        bytes memory /*calldata*/
    )
        public
        view
        override
        returns (bool upkeepNeeded, bytes memory /* performData */)
    {
        bool isOpen = (RaffleState.OPEN == s_raffleState);
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = address(this).balance > 0;
        bool upKeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
        return (upKeepNeeded, "0x0");
    }

    // executed when checkUpKeep returns true

    // externel functions
    function performUpkeep(bytes calldata /*performData*/) external override {
        // Request the random number
        // Once we get it, do something
        // 2 transaction process
        (bool upKeepNeeded, ) = checkUpkeep("");
        if (!upKeepNeeded) {
            revert Raffle_upKeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState),
                uint256(i_interval),
                uint256(block.timestamp - s_lastTimeStamp),
                upKeepNeeded
            );
        }
        s_raffleState = RaffleState.CALCULATING;
        
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            requestConfirmations,
            i_callbackGasLimit,
            numWords
        );
        emit RequestedRaffleWinner(requestId);
    }
    // internel functions
    function fulfillRandomWords(
        uint256,
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length; // ex -> anyMassiveNumber%sizeof_players = 0-sizeof_players -1
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_raffleState = RaffleState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = s_recentWinner.call{value: address(this).balance}(
            ""
        );
        if (!success) {
            revert Raffle_TransferFailed();
        }
        emit WinnerPicked(recentWinner);
    }

    /* view / pure functions */

    function getEnteranceFee() public view returns (uint256) {
        return s_enterenceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getNumWords() public pure returns (uint32) {
        return numWords; // this is a constant varibale and not reading from storage there for this  can be a storage function
    }

    function getNumberOfPlayer() public view returns (uint256) {
        return s_players.length;
    }

    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmation() public pure returns (uint256) {
        return requestConfirmations;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}

// chainlink vrf admin address
// 0x617c29352620719b42e9b66e2a284b664bc86b94
// https://vrf.chain.link/sepolia/4219

// remix ide url
// https://remix.ethereum.org/#url=https://docs.chain.link/samples/VRF/VRFv2Consumer.sol&lang=en&optimize=true&runs=200&evmVersion=london&version=soljson-v0.8.18+commit.87f61d96.js

// docs
// https://docs.chain.link/vrf/v2/subscription/examples/get-a-random-number

// modular fucntion

// chainlink automation
// https://docs.chain.link/chainlink-automation/compatible-contracts
