// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DaiMockToken is ERC20 {
    constructor() ERC20("DaiMockToken", "DAI") {
        _mint(msg.sender, 5000 * 10**18);
    }
}