pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "../access/Roles.sol";

/**
 * @title Crowdsale
 * @dev Crowdsale is a base contract for managing a token crowdsale.
*/

// TODO: use ReentrancyGuard(!!!)
contract Crowdsale is Roles, ReentrancyGuard {
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
  function () external payable {
    revert();
  }

  /**
   * @dev Set new wallet address.
   * @param newWallet New address where collected funds will be forwarded to
   */
  function setWallet(address newWallet) onlyOwner external {
    require(newWallet != address(0));
    _wallet = newWallet;
  }

  /**
   * @dev Buy tokens for foreign tokens.
   * @param tokenAddress Address of the foreign token
   * @param amount Amount of the foreign tokens
   */
  function buy(IERC20 tokenAddress, uint256 amount) external {
    buyToBeneficiary(tokenAddress, amount, msg.sender);
  }


  function buyToBeneficiary(IERC20 tokenAddress, uint256 amount, address beneficiary) public {
    _preValidatePurchase(tokenAddress, amount, beneficiary);

    //...
  }

  /**
   * @dev Withdraws any tokens from this contract to wallet.
   * @param tokenContract The address of the foreign token
   */
  function withdrawTokens(IERC20 tokenContract) onlyOwner external {
    // TODO: disallow withdraw stable tokens (freeze)
    // ...
  }

  // -----------------------------------------
  // Internal interface
  // -----------------------------------------

  function _preValidatePurchase(IERC20 tokenAddress, uint256 amount, address beneficiary) internal view {
    require(tokenAddress != address(0));
    require(beneficiary != address(0));
    require(amount > 0);
  }

  function _updatePurchasingState(IERC20 tokenAddress, uint256 amount, address beneficiary) internal {
    // ...
    // TODO: save deposits (for beneficiary)
  }

}
