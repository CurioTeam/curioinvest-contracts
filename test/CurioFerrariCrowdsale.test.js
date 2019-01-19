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
  const GOAL = TOKEN_SUPPLY;
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

  context('with deployed token', async function () {
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

    context('with deployed crowdsale', async function () {
      beforeEach(async function () {
        this.crowdsale = await CurioFerrariCrowdsale.new(
          this.openingTime, this.closingTime, wallet, this.token.address,
          this.acceptedToken.address, RATE, GOAL, REWARDS_PERCENT,
          { from: owner }
        );

        await this.token.transfer(this.crowdsale.address, TOKEN_SUPPLY, { from: owner });

        await this.crowdsale.changeAdmin(admin, { from: owner });
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

        beforeEach(async function () {
          await time.increaseTo(this.openingTime);

          // Add beneficiary to whitelist
          await this.crowdsale.addToWhitelist(investor, { from: admin });
        });

        // Tests without accepted tokens approve
        it('reverts on zero-valued payments', async function () {
          await shouldFail.reverting(this.crowdsale.buy(this.amount, { from: investor }));
          await shouldFail.reverting(this.crowdsale.buyToBeneficiary(this.amount, investor, { from: purchaser }));
        });

        context('with non-zero payments', async function () {
          beforeEach(async function () {
            // Transfer and approve accepted stable tokens to purchaser
            await this.acceptedToken.transfer(purchaser, this.value, { from: acceptedTokenOwner });
            await this.acceptedToken.approve(this.crowdsale.address, this.value, { from: purchaser });
          });

          describe('func buyToBeneficiary', function () {
            it('should accept payment', async function () {
              await this.crowdsale.buyToBeneficiary(this.amount, investor, { from: purchaser });
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
        });
      });
    });
  });
});
