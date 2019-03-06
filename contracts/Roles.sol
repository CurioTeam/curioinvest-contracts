pragma solidity ^0.5.0;

/**
 * @title Roles
 * @dev Contracts contains logic of owner and admin roles.
 */
contract Roles {
  // Address of the contract owner
  address private _owner;

  //Address of the contract admin
  address private _admin;

  /**
   * Event for ownership transfer logging
   * @param previousOwner Address of the previous owner
   * @param newOwner Address of the new owner
   */
  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

  /**
   * Event for logging of transfer admin authority
   * @param previousAdmin Address of the previous admin
   * @param newAdmin Address of the new admin
   */
  event AdminChanged(address indexed previousAdmin, address indexed newAdmin);

  /**
   * @dev Constructor.
   */
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

  /**
   * @return the address of the admin.
   */
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

  /**
   * @dev Throws if called by any account other than the admin.
   */
  modifier onlyAdmin() {
    require(isAdmin());
    _;
  }

  /**
   * @dev Throws if called by any account other than the owner or the admin.
   */
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

  /**
   * @return true if `msg.sender` is the admin of the contract.
   */
  function isAdmin() public view returns (bool) {
    return msg.sender == _admin;
  }

  /**
   * @dev Allows the current owner to transfer control of the contract to a new owner.
   * @param newOwner The address to transfer ownership to.
   */
  function transferOwnership(address newOwner) public onlyOwner {
    require(newOwner != address(0));
    emit OwnershipTransferred(_owner, newOwner);
    _owner = newOwner;
  }

  /**
   * @dev Allows the current owner to transfer admin authority of the contract to a new admin.
   * @param newAdmin The address of the new admin.
   */
  function changeAdmin(address newAdmin) public onlyOwner {
    require(newAdmin != address(0));
    emit AdminChanged(_admin, newAdmin);
    _admin = newAdmin;
  }
}
