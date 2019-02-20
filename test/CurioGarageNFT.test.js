const { time } = require('openzeppelin-test-helpers');

const CurioGarageNFT = artifacts.require('CurioGarageNFT');

contract('CurioGarageNFT', function ([_, creator]) {
  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await time.advanceBlock();
  });

  beforeEach(async function () {
    this.nft = await CurioGarageNFT.new({ from: creator });
  });

  it('has a name', async function () {
    (await this.nft.name()).should.equal('CurioGarageNFT');
  });

  it('has a symbol', async function () {
    (await this.nft.symbol()).should.equal('CGNFT');
  });
});
