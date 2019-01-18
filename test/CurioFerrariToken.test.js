const { constants, expectEvent } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;

const CurioFerrariToken = artifacts.require('CurioFerrariToken');

contract('CurioFerrariToken', function ([_, creator]) {
  beforeEach(async function () {
    this.token = await CurioFerrariToken.new({ from: creator });
  });

  it('has a name', async function () {
    (await this.token.name()).should.equal('CurioFerrariToken');
  });

  it('has a symbol', async function () {
    (await this.token.symbol()).should.equal('CFТ');
  });

  it('has 18 decimals', async function () {
    (await this.token.decimals()).should.be.bignumber.equal('18');
  });

  it('assigns the initial total supply to the creator', async function () {
    const totalSupply = await this.token.totalSupply();
    const creatorBalance = await this.token.balanceOf(creator);

    creatorBalance.should.be.bignumber.equal(totalSupply);

    await expectEvent.inConstruction(this.token, 'Transfer', {
      from: ZERO_ADDRESS,
      to: creator,
      value: totalSupply,
    });
  });
});
