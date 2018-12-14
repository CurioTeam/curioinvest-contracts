pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

/**
 * @title CurioFerrariToken
 */
contract CurioFerrariToken is ERC20, ERC20Detailed {
  uint256 public constant INITIAL_SUPPLY = 890000 * (10 ** uint256(decimals()));

  /**
   * @dev Constructor that gives msg.sender all of existing tokens.
   */
  constructor () public ERC20Detailed("CurioFerrariToken", "CFТ", 18) {
    _mint(msg.sender, INITIAL_SUPPLY);
  }
}
