pragma solidity ^0.4.24;

contract Roles {
  address private _owner;
  address private _admin;

  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
  event AdminChanged(address indexed previousAdmin, address indexed newAdmin);

  constructor () internal {
    _owner = msg.sender;
    _admin = msg.sender;
    emit OwnershipTransferred(address(0), _owner);
    emit AdminChanged(address(0), _admin);
  }

  /**
   * @return the address of the owner.
   */
  function owner() public view returns (address) {
    return _owner;
  }

  function admin() public view returns (address) {
    return _admin;
  }

  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(isOwner());
    _;
  }

  modifier onlyAdmin() {
    require(isAdmin());
    _;
  }

  modifier onlyOwnerOrAdmin() {
    require(isOwner() || isAdmin());
    _;
  }

  /**
   * @return true if `msg.sender` is the owner of the contract.
   */
  function isOwner() public view returns (bool) {
    return msg.sender == _owner;
  }

  function isAdmin() public view returns (bool) {
    return msg.sender == _admin;
  }

  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param newOwner The address to transfer ownership to.
   */
  function transferOwnership(address newOwner) public onlyOwner {
    require(newOwner != address(0));
    emit OwnershipTransferred(_owner, newOwner);
    _owner = newOwner;
  }

  function changeAdmin(address newAdmin) public onlyOwner {
    require(newAdmin != address(0));
    emit AdminChanged(_admin, newAdmin);
    _admin = newAdmin;
  }
}
