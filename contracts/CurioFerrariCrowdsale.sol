pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "./Pausable.sol";

/**
* @title CurioFerrariCrowdsale
*/
contract CurioFerrariCrowdsale is Pausable, ReentrancyGuard {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  enum State { Active, Refunding, Closed, Rewarding }

  // Represents data of foreign token which can be exchange to token
  struct AcceptedToken {
    // name of foreign token
    string name;

    // number of token units a buyer gets per foreign token unit
    uint256 rate;

    // amount of raised foreign tokens
    uint256 raised;
  }

  event RefundsClosed();
  event RefundsEnabled();
  event Deposited(address indexed payee, address indexed token, uint256 amount);
  event Withdrawn(address indexed payee, address indexed token, uint256 amount);

  event CrowdsaleFinalized();

  State private _state;

  uint256 private _saleGoal;

  // _deposits[beneficiary][token] = amount
  mapping(address => mapping (address => uint256)) private _deposits;

  // The token being sold
  IERC20 private _token;

  mapping(address => uint256) private _balances;

  // Map from accepted token address to accepted token data
  mapping (address => AcceptedToken) public acceptedTokens;

  mapping (address => bool) private _whitelist;

  // Address where funds are collected
  address private _wallet;

  // Amount of tokens sold
  uint256 private _tokensSold;

  bool private _finalized;

  uint256 private _openingTime;
  uint256 private _closingTime;

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

  /**
   * @dev Constructor.
   * @param openingTime Crowdsale opening time
   * @param closingTime Crowdsale closing time
   * @param wallet Address where collected funds will be forwarded to
   * @param token Address of the token being sold
   * @param saleGoal Goal for sold tokens
   */
  constructor (uint256 openingTime, uint256 closingTime, address wallet, IERC20 token, uint256 saleGoal) public {
    require(openingTime >= block.timestamp);
    require(closingTime > openingTime);
    require(wallet != address(0));
    require(token != address(0));
    require(saleGoal > 0);

    _openingTime = openingTime;
    _closingTime = closingTime;
    _wallet = wallet;
    _token = token;
    _saleGoal = saleGoal;
    _state = State.Active;

    _finalized = false;
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

  function saleGoal() public view returns (uint256) {
    return _saleGoal;
  }

  function state() public view returns (State) {
    return _state;
  }

  /**
   * @return true if the crowdsale is finalized, false otherwise.
   */
  function finalized() public view returns (bool) {
    return _finalized;
  }

  /**
   * @return the crowdsale opening time.
   */
  function openingTime() public view returns (uint256) {
    return _openingTime;
  }

  /**
   * @return the crowdsale closing time.
   */
  function closingTime() public view returns (uint256) {
    return _closingTime;
  }

  /**
   * @return true if the crowdsale is open, false otherwise.
   */
  function isOpen() public view returns (bool) {
    return block.timestamp >= _openingTime && block.timestamp <= _closingTime;
  }

  /**
   * @dev Checks whether the period in which the crowdsale is open has already elapsed.
   * @return Whether crowdsale period has elapsed
   */
  function hasClosed() public view returns (bool) {
    return block.timestamp > _closingTime;
  }

  function isWhitelisted(address account) public view returns (bool) {
    return _whitelist[account];
  }

  /**
   * @dev Adds single address to whitelist.
   * @param account Address to be added to the whitelist
   */
  function addToWhitelist(address account) external onlyAdmin {
    _whitelist[account] = true;
  }

  /**
   * @dev Adds list of addresses to whitelist. Not overloaded due to limitations with truffle testing.
   * @param accounts Addresses to be added to the whitelist
   */
  function addManyToWhitelist(address[] accounts) external onlyAdmin {
    for (uint256 i = 0; i < accounts.length; i++) {
      _whitelist[accounts[i]] = true;
    }
  }

  /**
   * @dev Removes single address from whitelist.
   * @param account Address to be removed to the whitelist
   */
  function removeFromWhitelist(address account) external onlyAdmin {
    _whitelist[account] = false;
  }

  /**
   * @dev Must be called after crowdsale ends, to do some extra finalization
   * work. Calls the contract's finalization function.
   */
  function finalize() public {
    require(!_finalized);

    require(hasClosed() || goalReached());

    _finalized = true;

    if (goalReached()) {
      _close();
    } else {
      _enableRefunds();
    }

    emit CrowdsaleFinalized();
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

  /**
   * @dev Withdraw tokens only after crowdsale ends.
   * @param beneficiary Whose tokens will be withdrawn.
   */
  function withdrawTokens(address beneficiary) public {
    require(finalized());
    require(goalReached());
    // require(hasClosed());

    uint256 amount = _balances[beneficiary];
    require(amount > 0);
    _balances[beneficiary] = 0;
    _deliverTokens(beneficiary, amount);
  }

  /**
   * @return the balance of an account.
   */
  function balanceOf(address account) public view returns (uint256) {
    return _balances[account];
  }

  /**
   * @dev Investors can claim refunds here if crowdsale is unsuccessful
   * @param refundee Whose refund will be claimed.
   */
  function claimRefund(address refundee, IERC20 tokenContract) public {
    require(finalized());
    // require(!goalReached());
    require(_state == State.Refunding);

    _withdraw(tokenContract, refundee);
  }

  /**
   * @dev Checks whether funding goal was reached.
   * @return Whether funding goal was reached
   */
  function goalReached() public view returns (bool) {
    return tokensSold() >= _saleGoal;
  }

  /**
   * @dev Withdraws any tokens from this contract to wallet.
   * @param tokenContract The address of the token
   */
  function withdraw(IERC20 tokenContract) onlyOwnerOrAdmin external {
    require(tokenContract != address(0));
    require(_state == State.Closed); // only goal reached!!! before - tokens frozen

    uint256 amount = tokenContract.balanceOf(address(this));
    tokenContract.safeTransfer(wallet(), amount);
  }


  function depositsOf(address payee, IERC20 tokenContract) public view returns (uint256) {
    return _deposits[payee][tokenContract];
  }

  // -----------------------------------------
  // Internal interface
  // -----------------------------------------

  function _preValidatePurchase(IERC20 tokenAddress, uint256 amount, address beneficiary) internal view whenNotPaused {
    require(isOpen());

    require(beneficiary != address(0));
    require(isWhitelisted(beneficiary));

    require(tokenAddress != address(0));
    require(acceptedTokens[tokenAddress].rate > 0);

    require(amount > 0);
  }

  /**
  * @dev Executed when a purchase has been validated and is ready to be executed. Not necessarily emits/sends tokens.
  * @param beneficiary Address receiving the tokens
  * @param amount Number of tokens to be purchased
  */
  function _processPurchase(address beneficiary, uint256 amount) internal {
    _balances[beneficiary] = _balances[beneficiary].add(amount);
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
    _deposit(tokenAddress, amount, beneficiary);

    acceptedTokens[tokenAddress].raised = acceptedTokens[tokenAddress].raised.add(amount);
  }

  /**
     * @dev Allows for the beneficiary to withdraw their funds, rejecting
     * further deposits.
     */
  function _close() internal {
    require(_state == State.Active);
    _state = State.Closed;
    emit RefundsClosed();
  }

  /**
   * @dev Allows for refunds to take place, rejecting further deposits.
   */
  function _enableRefunds() internal {
    require(_state == State.Active);
    _state = State.Refunding;
    emit RefundsEnabled();
  }

  /**
  * @dev Stores the sent amount as credit to be withdrawn.
  * @param payee The destination address of the funds.
  */
  function _deposit(IERC20 tokenAddress, uint256 amount, address payee) internal {
    _deposits[payee][tokenAddress] = _deposits[payee][tokenAddress].add(amount);

    emit Deposited(payee, tokenAddress, amount);
  }

  /**
  * @dev Withdraw accumulated balance for a payee.
  * @param payee The address whose funds will be withdrawn and transferred to.
  */
  function _withdraw(IERC20 tokenAddress, address payee) internal {
    uint256 payment = _deposits[payee][tokenAddress];

    _deposits[payee][tokenAddress] = 0;

    tokenAddress.safeTransfer(payee, payment);

    emit Withdrawn(payee, tokenAddress, payment);
  }
}
