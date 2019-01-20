pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol";
import "openzeppelin-solidity/contracts/token/ERC721/ERC721MetadataMintable.sol";

/**
 * @title CurioGarage Non-Fungible Token
 */
contract CurioGarageNFT is ERC721Full, ERC721MetadataMintable {
  constructor () public ERC721Full("CurioGarageNFT", "CGNFT") {}
}
