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

contract Crowdsale is Roles, ReentrancyGuard {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  // Represents data of foreign token which can be exchange to token
  struct AcceptedToken {
    // name of foreign token
    string name;

    // number of token units a buyer gets per foreign token unit
    uint256 rate;

    // amount of raised foreign tokens
    uint256 raised;
  }

  // The token being sold
  IERC20 private _token;

  // Map from accepted token address to accepted token data
  mapping (address => AcceptedToken) public acceptedTokens;

  // Address where funds are collected
  address private _wallet;

  // Amount of tokens sold
  uint256 private _tokensSold;

  /**
   * Event for add accepted token logging
   * @param tokenAddress address of added foreign token
   * @param name name of added token
   * @param rate number of token units a buyer gets per added foreign token unit
   */
  event AcceptedTokenAdded(
    address indexed tokenAddress,
    string name,
    uint256 rate
  );

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
   * @dev Adds accepted foreign token.
   * @param tokenAddress Address of the foreign token being added
   * @param tokenName Name of the foreign token
   * @param tokenRate Number of token units a buyer gets per foreign token unit
   */
  function addAcceptedToken(
    IERC20 tokenAddress,
    string tokenName,
    uint256 tokenRate
  )
    onlyOwner
    external
  {
    require(tokenAddress != address(0));
    require(tokenRate > 0);
    require(acceptedTokens[tokenAddress].rate == 0);

    AcceptedToken memory token = AcceptedToken({
      name: tokenName,
      rate: tokenRate,
      raised: 0
    });

    acceptedTokens[tokenAddress] = token;

    emit AcceptedTokenAdded(
      tokenAddress,
      token.name,
      token.rate
    );
  }

  /**
   * @dev Buy tokens for foreign tokens.
   * @param tokenAddress Address of the foreign token
   * @param tokenAmount Amount of the foreign tokens
   */
  function buy(IERC20 tokenAddress, uint256 tokenAmount) external {
    buyToBeneficiary(tokenAddress, tokenAmount, msg.sender);
  }

  function buyToBeneficiary(IERC20 tokenAddress, uint256 tokenAmount, address beneficiary) public nonReentrant {
    _preValidatePurchase(tokenAddress, tokenAmount, beneficiary);

    uint256 value = tokenAmount;

    tokenAddress.safeTransferFrom(msg.sender, address(this), value);

    // Available tokens
    uint256 tokenBalance = _token.balanceOf(address(this));
    require(tokenBalance > 0);

    // How many tokens will be buy
    uint256 amount = value.mul(acceptedTokens[tokenAddress].rate);

    if (amount > tokenBalance) {
      amount = tokenBalance;
      value = amount.div(acceptedTokens[tokenAddress].rate);

      uint256 excess = tokenAmount.sub(value);
      tokenAddress.safeTransfer(beneficiary, excess);

      emit ExcessSent(beneficiary, tokenAddress, excess);
    }

    // update state
    _tokensSold = _tokensSold.add(amount);

    _processPurchase(beneficiary, amount); // send tokens to beneficiary
    emit TokensPurchased(msg.sender, beneficiary, tokenAddress, value, amount);

    _updatePurchasingState(tokenAddress, value, beneficiary);
  }

  /**
   * @dev Withdraws any tokens from this contract to wallet.
   * @param token The address of the foreign token
   */
  function withdrawForeignTokens(IERC20 token) onlyOwner external {
    require(token != address(0));
    require(acceptedTokens[token].rate == 0); // Any not accepted tokens

    uint256 amount = token.balanceOf(address(this));
    token.safeTransfer(_wallet, amount);
  }

  // -----------------------------------------
  // Internal interface
  // -----------------------------------------

  function _preValidatePurchase(IERC20 tokenAddress, uint256 amount, address beneficiary) internal view {
    require(tokenAddress != address(0));
    require(acceptedTokens[tokenAddress].rate > 0);

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
    _token.safeTransfer(beneficiary, amount);
  }

  function _updatePurchasingState(IERC20 tokenAddress, uint256 amount, address beneficiary) internal {
    acceptedTokens[tokenAddress].raised = acceptedTokens[tokenAddress].raised.add(amount);
  }
}
