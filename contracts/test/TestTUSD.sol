pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

/**
 * @title TestTUSD
 * @dev Very simple ERC20 Token example, where all tokens are pre-assigned to the creator.
 * Note they can later distribute these tokens as they wish using `transfer` and other
 * `ERC20` functions.
 */
contract TestTUSD is ERC20, ERC20Detailed {
  uint256 public constant INITIAL_SUPPLY = 100000000 * (10 ** uint256(decimals()));

  /**
   * @dev Constructor that gives msg.sender all of existing tokens.
   */
  constructor () public ERC20Detailed("TestTUSD", "TTUSD", 18) {
    _mint(msg.sender, INITIAL_SUPPLY);
  }
}
