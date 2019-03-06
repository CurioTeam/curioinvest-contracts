pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol";
import "openzeppelin-solidity/contracts/token/ERC721/ERC721MetadataMintable.sol";

/**
 * @title CurioGarageNFT
 * @dev ERC721 Token, represents unique car-tokens of Curio garage.
 */
contract CurioGarageNFT is ERC721Full, ERC721MetadataMintable {
  constructor () public ERC721Full("CurioGarageNFT", "CGNFT") {}
}
