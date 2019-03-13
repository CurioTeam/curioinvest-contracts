pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

/**
 * @title CurioFerrariToken
 * @dev ERC20 Token, where all tokens are pre-assigned to the creator.
 * Token represents shares of Ferrari F12tdf car.
 */
contract CurioFerrariToken is ERC20, ERC20Detailed {
    uint8 public constant DECIMALS = 18;
    uint256 public constant INITIAL_SUPPLY = 1100000 * (10 ** uint256(DECIMALS));

    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     */
    constructor () public ERC20Detailed("CurioFerrariToken", "CFТ", DECIMALS) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
}
