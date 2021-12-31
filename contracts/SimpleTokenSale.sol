// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./SimpleToken.sol";

interface Students {
    function getStudentsList() external view returns (string[] memory);
}

interface Aggregator {
    function decimals() external view returns (uint8);

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

contract SimpleTokenSale {
    address owner;
    SimpleToken public tokenContact;
    address public daiContract;
    Students public studentsContract;
    Aggregator public priceFeedETHUSD;
    Aggregator public priceFeedDAIUSD;

    event Bought(address _buyer, uint256 _amount);
    event Sold(address _seller, uint256 _amount);

    constructor(
        address _tokenContact,
        address _daiContract,
        address _studentsContract,
        address _chainLinkETHUSDRinkeby,
        address _chainLinkDAIUSDRinkeby
    ) {
        owner = msg.sender;
        tokenContact = SimpleToken(_tokenContact);
        daiContract = _daiContract;
        studentsContract = Students(_studentsContract);
        priceFeedETHUSD = Aggregator(_chainLinkETHUSDRinkeby);
        priceFeedDAIUSD = Aggregator(_chainLinkDAIUSDRinkeby);
    }

    function buyTokens() public payable {
        require(msg.value > 0, "Amount of tokens can't be 0");

        uint256 amount = msg.value * getPrice(priceFeedETHUSD);

        try ERC20(tokenContact).transfer(msg.sender, amount) {
            emit Bought(msg.sender, msg.value);
        } catch Error(string memory) {
            (bool success, ) = msg.sender.call{value: msg.value}(
                "Sorry, there is not enough tokens to buy"
            );
            require(success, "External call failed");
        } catch (bytes memory reason) {
            (bool success, ) = msg.sender.call{value: msg.value}(reason);
            require(success, "External call failed");
        }
    }

    function buyTokensForDai(uint256 _amounDai) public {
        require(_amounDai > 0, "Amount of tokens can't be 0");
        require(
            ERC20(daiContract).allowance(msg.sender, address(this)) >=
                _amounDai,
            "Spending tokens are not allowed"
        );

        uint256 amount = _amounDai * getPrice(priceFeedDAIUSD);

        ERC20(daiContract).transferFrom(msg.sender, address(this), _amounDai);
        emit Sold(msg.sender, _amounDai);

        ERC20(tokenContact).transfer(msg.sender, amount);
        emit Bought(msg.sender, amount);
    }

    function getPrice(Aggregator _priceFeed) public view returns (uint256) {
        uint256 registeredStudentsLength = getRegisteredStudentsLength();
        require(registeredStudentsLength > 0, "Students lenght can't be 0");

        (, int256 price, , , ) = _priceFeed.latestRoundData();
        return
            uint256(price) /
            (10**_priceFeed.decimals()) /
            registeredStudentsLength;
    }

    function getRegisteredStudentsLength() public view returns (uint256) {
        return studentsContract.getStudentsList().length;
    }
}
