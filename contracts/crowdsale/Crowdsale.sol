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

  // Amount of tokens sold
  uint256 private _tokensSold;

  /**
   * Event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param beneficiary who got the tokens
   * @param token address of foreign token
   * @param value foreign tokens units paid for purchase
   * @param amount amount of tokens purchased
   */
  event TokensPurchased(
    address indexed purchaser,
    address indexed beneficiary,
    address indexed token,
    uint256 value,
    uint256 amount
  );

  /**
   * Event for send foreign tokens excess logging
   * @param beneficiary who gets excess in foreign tokens
   * @param token address of foreign token
   * @param value excess token units
   */
  event ExcessSent(
    address indexed beneficiary,
    address indexed token,
    uint256 value
  );

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
    * @return the address where funds are collected.
    */
  function wallet() public view returns (address) {
    return _wallet;
  }

  /**
    * @return the amount of tokens sold.
    */
  function tokensSold() public view returns (uint256) {
    return _tokensSold;
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
   * @param tokenAmount Amount of the foreign tokens
   */
  function buy(IERC20 tokenAddress, uint256 tokenAmount) external {
    buyToBeneficiary(tokenAddress, tokenAmount, msg.sender);
  }

  function buyToBeneficiary(IERC20 tokenAddress, uint256 tokenAmount, address beneficiary) public {
    _preValidatePurchase(tokenAddress, tokenAmount, beneficiary);

    uint256 value = tokenAmount;

    require(tokenAddress.transferFrom(msg.sender, address(this), value));

    // Available tokens
    uint256 tokenBalance = _token.balanceOf(address(this));
    require(tokenBalance > 0);

    // How many tokens will be buy
    // uint256 amount = _getTokenAmount(tokenAddress, value); // TODO: add this function
    uint256 amount = value; // TODO: remove 1:1 rate

    if (amount > tokenBalance) {
      amount = tokenBalance;
      // value = _inverseGetTokenAmount(tokenAddress, amount); // TODO: add this function
      value = amount; // TODO: remove 1:1 rate

      uint256 excess = tokenAmount.sub(value);
      tokenAddress.transfer(beneficiary, excess);

      emit ExcessSent(beneficiary, tokenAddress, excess);
    }

    // update state
    _tokensSold = _tokensSold.add(amount);

    // receivedTokens[_tokenAddress].raised = receivedTokens[_tokenAddress].raised.add(value);

    _processPurchase(beneficiary, amount); // send tokens to beneficiary

    emit TokensPurchased(msg.sender, beneficiary, tokenAddress, value, amount);

    _updatePurchasingState(tokenAddress, amount, beneficiary);
  }

  /**
   * @dev Withdraws any tokens from this contract to wallet.
   * @param tokenContract The address of the foreign token
   */
  function withdrawForeignTokens(IERC20 tokenContract) onlyOwnerOrAdmin external {
    // TODO: disallow withdraw stable tokens (freeze)
    // ...
    // TODO: or remove this function
  }

  // -----------------------------------------
  // Internal interface
  // -----------------------------------------

  function _preValidatePurchase(IERC20 tokenAddress, uint256 amount, address beneficiary) internal view {
    require(tokenAddress != address(0));
    // require(receivedTokens[_tokenAddress].rate > 0); TODO: add functionality

    require(beneficiary != address(0));
    require(amount > 0);
  }

  /**
  * @dev Executed when a purchase has been validated and is ready to be executed. Not necessarily emits/sends tokens.
  * @param beneficiary Address receiving the tokens
  * @param amount Number of tokens to be purchased
  */
  function _processPurchase(address beneficiary, uint256 amount) internal {
    _deliverTokens(beneficiary, amount);
  }

  /**
   * @dev Source of tokens.
   * @param beneficiary Address performing the token purchase
   * @param amount Number of tokens to be emitted
   */
  function _deliverTokens(address beneficiary, uint256 amount) internal {
    _token.transfer(beneficiary, amount);
  }

  function _updatePurchasingState(IERC20 tokenAddress, uint256 amount, address beneficiary) internal {

  }

}
