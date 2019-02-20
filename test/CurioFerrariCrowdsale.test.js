const { BN, constants, ether, expectEvent, shouldFail, should, time } = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;

const CurioFerrariCrowdsale = artifacts.require('CurioFerrariCrowdsale');
const CurioFerrariToken = artifacts.require('CurioFerrariToken');
const TestStableToken = artifacts.require('TestStableToken');

contract('CurioFerrariCrowdsale', function (
  [_, owner, admin, acceptedTokenOwner, wallet, purchaser, investor, investor2, investorCar, anyone]
) {
  const TOKEN_SUPPLY = ether('1100000');
  const RATE = new BN(1);
  const GOAL = TOKEN_SUPPLY.div(RATE);
  const REWARDS_PERCENT = new BN(1000); // 10% reward

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await time.advanceBlock();
  });

  beforeEach(async function () {
    this.openingTime = (await time.latest()).add(time.duration.weeks(1));
    this.closingTime = this.openingTime.add(time.duration.weeks(12));
    this.afterClosingTime = this.closingTime.add(time.duration.seconds(1));

    this.acceptedToken = await TestStableToken.new({ from: acceptedTokenOwner });
  });

  it('requires a non-null token', async function () {
    await shouldFail.reverting(CurioFerrariCrowdsale.new(
      this.openingTime, this.closingTime,
      wallet, ZERO_ADDRESS, this.acceptedToken.address, RATE, GOAL, REWARDS_PERCENT
    ));
  });

  context('with token', async function () {
    beforeEach(async function () {
      this.token = await CurioFerrariToken.new({ from: owner });
    });

    it('requires a correct accepted token', async function () {
      await shouldFail.reverting(CurioFerrariCrowdsale.new(
        this.openingTime, this.closingTime,
        wallet, this.token.address, ZERO_ADDRESS, RATE, GOAL, REWARDS_PERCENT
      ));

      await shouldFail.reverting(CurioFerrariCrowdsale.new(
        this.openingTime, this.closingTime,
        wallet, this.token.address, this.token.address, RATE, GOAL, REWARDS_PERCENT
      ));
    });

    it('requires a non-null wallet', async function () {
      await shouldFail.reverting(CurioFerrariCrowdsale.new(
        this.openingTime, this.closingTime,
        ZERO_ADDRESS, this.token.address, this.acceptedToken.address, RATE, GOAL, REWARDS_PERCENT
      ));
    });

    it('requires a non-zero rate', async function () {
      await shouldFail.reverting(CurioFerrariCrowdsale.new(
        this.openingTime, this.closingTime,
        wallet, this.token.address, this.acceptedToken.address, 0, GOAL, REWARDS_PERCENT
      ));
    });

    it('requires a non-zero goal', async function () {
      await shouldFail.reverting(CurioFerrariCrowdsale.new(
        this.openingTime, this.closingTime,
        wallet, this.token.address, this.acceptedToken.address, RATE, 0, REWARDS_PERCENT
      ));
    });

    it('requires a non-zero rewards percent', async function () {
      await shouldFail.reverting(CurioFerrariCrowdsale.new(
        this.openingTime, this.closingTime,
        wallet, this.token.address, this.acceptedToken.address, RATE, GOAL, 0
      ));
    });

    it('requires a correct rewards percent', async function () {
      await shouldFail.reverting(CurioFerrariCrowdsale.new(
        this.openingTime, this.closingTime,
        wallet, this.token.address, this.acceptedToken.address, RATE, GOAL, new BN(10001)
      ));
    });

    context('once deployed', async function () {
      beforeEach(async function () {
        this.crowdsale = await CurioFerrariCrowdsale.new(
          this.openingTime, this.closingTime, wallet, this.token.address,
          this.acceptedToken.address, RATE, GOAL, REWARDS_PERCENT,
          { from: owner }
        );

        await this.token.transfer(this.crowdsale.address, TOKEN_SUPPLY, { from: owner });

        await this.crowdsale.changeAdmin(admin, { from: owner });

        await this.crowdsale.addToWhitelist(investor, { from: admin });

        await time.increaseTo(this.openingTime);
      });

      it('should create crowdsale with correct parameters', async function () {
        should.exist(this.crowdsale);
        should.exist(this.token);

        (await this.crowdsale.openingTime()).should.be.bignumber.equal(this.openingTime);
        (await this.crowdsale.closingTime()).should.be.bignumber.equal(this.closingTime);
        (await this.crowdsale.wallet()).should.be.equal(wallet);
        (await this.crowdsale.token()).should.be.equal(this.token.address);
        (await this.crowdsale.acceptedToken()).should.be.equal(this.acceptedToken.address);
        (await this.crowdsale.rate()).should.be.bignumber.equal(RATE);
        (await this.crowdsale.goal()).should.be.bignumber.equal(GOAL);
        (await this.crowdsale.rewardsPercent()).should.be.bignumber.equal(REWARDS_PERCENT);

        (await this.crowdsale.raised()).should.be.bignumber.equal(new BN(0));
      });

      describe('accepting payments', function () {
        before(function () {
          this.amount = ether('42');
          this.value = this.amount.div(RATE);
        });

        const transferAndApprove = async (token, contract, beneficiary, value) => {
          await token.transfer(beneficiary, value, { from: acceptedTokenOwner });
          await token.approve(contract, value, { from: beneficiary });
        };

        it('reverts on ether payments', async function () {
          await shouldFail.reverting(this.crowdsale.send(ether('1'), { from: investor }));
        });

        it('reverts on zero-valued payments', async function () {
          await shouldFail.reverting(this.crowdsale.buy(this.amount, { from: investor }));
          await shouldFail.reverting(this.crowdsale.buyToBeneficiary(this.amount, investor, { from: purchaser }));
        });

        describe('high-level purchase', function () {
          beforeEach(async function () {
            await transferAndApprove(this.acceptedToken, this.crowdsale.address, investor, this.value);
          });

          it('should accept payment', async function () {
            await this.crowdsale.buy(this.amount, { from: investor });
          });

          it('should log purchase', async function () {
            const { logs } = await this.crowdsale.buy(this.amount, { from: investor });
            expectEvent.inLogs(logs, 'TokensPurchased', {
              purchaser: investor,
              beneficiary: investor,
              value: this.value,
              amount: this.amount,
            });
          });
        });

        describe('low-level purchase', function () {
          context('without return excess', function () {
            beforeEach(async function () {
              await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, this.value);
            });

            it('requires a non-null beneficiary', async function () {
              await shouldFail.reverting(
                this.crowdsale.buyToBeneficiary(this.amount, ZERO_ADDRESS, { from: purchaser })
              );
            });

            it('should accept payment', async function () {
              await this.crowdsale.buyToBeneficiary(this.amount, investor, { from: purchaser });
            });

            it('should save deposited funds for beneficiary', async function () {
              await this.crowdsale.buyToBeneficiary(this.amount, investor, { from: purchaser });
              (await this.crowdsale.depositsOf(investor)).should.be.bignumber.equal(this.value);
            });

            it('should save tokens balance of beneficiary', async function () {
              await this.crowdsale.buyToBeneficiary(this.amount, investor, { from: purchaser });
              (await this.crowdsale.balanceOf(investor)).should.be.bignumber.equal(this.amount);
            });

            it('should increase raised funds', async function () {
              await this.crowdsale.buyToBeneficiary(this.amount, investor, { from: purchaser });
              (await this.crowdsale.raised()).should.be.bignumber.equal(this.value);
            });

            it('should collect raised funds on contract', async function () {
              await this.crowdsale.buyToBeneficiary(this.amount, investor, { from: purchaser });
              (await this.acceptedToken.balanceOf(this.crowdsale.address)).should.be.bignumber.equal(this.value);
            });

            it('should log purchase', async function () {
              const { logs } = await this.crowdsale.buyToBeneficiary(this.amount, investor, { from: purchaser });
              expectEvent.inLogs(logs, 'TokensPurchased', {
                purchaser: purchaser,
                beneficiary: investor,
                value: this.value,
                amount: this.amount,
              });
            });
          });

          context('with return excess', function () {
            before(function () {
              // Value with excess
              this.excess = new BN(1);
              this.value = GOAL.add(this.excess);
              this.amount = this.value.mul(RATE);
            });

            beforeEach(async function () {
              await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, this.value);
            });

            it('should collect raised funds on contract without excess', async function () {
              await this.crowdsale.buyToBeneficiary(this.amount, investor, { from: purchaser });
              (await this.acceptedToken.balanceOf(this.crowdsale.address))
                .should.be.bignumber.equal(this.value.sub(this.excess));
            });

            it('should increase raised funds without excess', async function () {
              await this.crowdsale.buyToBeneficiary(this.amount, investor, { from: purchaser });
              (await this.crowdsale.raised()).should.be.bignumber.equal(this.value.sub(this.excess));
            });

            it('should return excess to beneficiary', async function () {
              await this.crowdsale.buyToBeneficiary(this.amount, investor, { from: purchaser });
              (await this.acceptedToken.balanceOf(investor)).should.be.bignumber.equal(this.excess);
            });

            it('should log returned excess', async function () {
              const { logs } = await this.crowdsale.buyToBeneficiary(this.amount, investor, { from: purchaser });
              expectEvent.inLogs(logs, 'ExcessSent', {
                beneficiary: investor,
                value: this.excess,
              });
            });
          });
        });
      });
    });
  });
});
