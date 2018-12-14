pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";

import "./Roles.sol";

// TODO: add whitelist - adding and removing (only admin or owner)
// TODO: add admin role and owner
// TODO: _preValidationPurchase: check whitelist for beneficiary
// TODO: use ReentrancyGuard
// TODO: contract don't accept Ether
// TODO: add received tokens and its rates
// TODO: timed
// TODO: refundable
// TODO: add pausable
contract CurioFerrariTokenSale is Roles, ReentrancyGuard {
  using SafeMath for uint256;
  using SafeERC20 for IERC20; // TODO: use safe-functions(!!!)

  // The token being sold
  IERC20 private _token;

  // Address where funds are collected
  address private _wallet;

  constructor (address wallet, IERC20 token) public {
    require(wallet != address(0));
    require(token != address(0));

    _wallet = wallet;
    _token = token;
  }


  // -----------------------------------------
  // External interface
  // -----------------------------------------


  // -----------------------------------------
  // Internal interface
  // -----------------------------------------

}
