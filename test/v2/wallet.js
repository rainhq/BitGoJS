//
// Tests for Wallets
//

const assert = require('assert');
const should = require('should');
const _ = require('lodash');
const Promise = require('bluebird');
const co = Promise.coroutine;

const TestV2BitGo = require('../lib/test_bitgo');

describe('V2 Wallet:', function() {
  let bitgo;
  let wallets;
  let basecoin;
  let wallet;
  let sequenceId;
  let walletAddress;

  // TODO: automate keeping test wallet full with bitcoin
  // If failures are occurring, make sure that the wallet at test.bitgo.com contains bitcoin.
  // The wallet is named Test Wallet, and its information is sometimes cleared from the test environment, causing
  // many of these tests to fail. If that is the case, send it some bitcoin with at least 2 transactions
  // to make sure the tests will pass.

  before(function() {
    // TODO: replace dev with test
    bitgo = new TestV2BitGo({ env: 'test' });
    bitgo.initializeTestVars();
    basecoin = bitgo.coin('tbtc');
    wallets = basecoin.wallets();
    basecoin.keychains();

    return bitgo.authenticateTestUser(bitgo.testUserOTP())
    .then(function() {
      return wallets.getWallet({ id: TestV2BitGo.V2.TEST_WALLET1_ID });
    })
    .then(function(testWallet) {
      wallet = testWallet;
    });
  });

  describe('Create Address', function() {

    it('should create a new address', function() {
      return wallet.createAddress()
      .then(function(newAddress) {
        newAddress.should.have.property('address');
        newAddress.should.have.property('coin');
        newAddress.should.have.property('wallet');
        newAddress.wallet.should.equal(wallet._wallet.id);
        newAddress.coin.should.equal(wallet._wallet.coin);
      });
    });

  });

  describe('List Unspents', function() {

    it('unspents', function() {
      return wallet.unspents()
      .then(function(unspents) {
        unspents.should.have.property('coin');
        unspents.should.have.property('unspents');
        unspents.unspents.length.should.be.greaterThan(2);
      });
    });
  });

  describe('List Addresses', function() {

    it('addresses', function() {
      return wallet.addresses()
      .then(function(addresses) {
        addresses.should.have.property('coin');
        addresses.should.have.property('count');
        addresses.should.have.property('addresses');
        addresses.addresses.length.should.be.greaterThan(2);
        walletAddress = _.head(addresses.addresses).address;
      });
    });

    it('should get single address', function() {
      return wallet.getAddress({ address: walletAddress })
      .then(function(address) {
        address.should.have.property('coin');
        address.should.have.property('wallet');
        address.address.should.equal(walletAddress);
        address.wallet.should.equal(wallet.id());
      });
    });

    it('getbalances', function() {
      // TODO server currently doesn't use this param
    });

    it('prevId', function() {
      // TODO server currently doesn't use this param
    });
  });

  describe('List Transactions', function() {

    it('transactions', function() {
      return wallet.transactions()
      .then(function(transactions) {
        transactions.should.have.property('coin');
        transactions.should.have.property('transactions');
        transactions.transactions.length.should.be.greaterThan(2);
        const firstTransaction = transactions.transactions[0];
        firstTransaction.should.have.property('date');
        firstTransaction.should.have.property('entries');
        firstTransaction.should.have.property('fee');
        firstTransaction.should.have.property('hex');
        firstTransaction.should.have.property('id');
        firstTransaction.should.have.property('inputIds');
        firstTransaction.should.have.property('inputs');
        firstTransaction.should.have.property('outputs');
        firstTransaction.should.have.property('size');
      });
    });

    it('transactions with limit', function() {
      return wallet.transactions({ limit: 2 })
      .then(function(transactions) {
        transactions.should.have.property('coin');
        transactions.should.have.property('transactions');
        transactions.transactions.length.should.eql(2);
        const firstTransaction = transactions.transactions[0];
        firstTransaction.should.have.property('date');
        firstTransaction.should.have.property('entries');
        firstTransaction.should.have.property('fee');
        firstTransaction.should.have.property('hex');
        firstTransaction.should.have.property('id');
        firstTransaction.should.have.property('inputIds');
        firstTransaction.should.have.property('inputs');
        firstTransaction.should.have.property('outputs');
        firstTransaction.should.have.property('size');
      });
    });

    it('should fetch transaction by id', function() {
      return wallet.getTransaction({ txHash: '96b2376fb0ccfdbcc9472489ca3ec75df1487b08a0ea8d9d82c55da19d8cceea' })
      .then(function(transaction) {
        transaction.should.have.property('id');
        transaction.should.have.property('normalizedTxHash');
        transaction.should.have.property('date');
        transaction.should.have.property('blockHash');
        transaction.should.have.property('blockHeight');
        transaction.should.have.property('blockPosition');
        transaction.should.have.property('confirmations');
        transaction.should.have.property('fee');
        transaction.should.have.property('feeString');
        transaction.should.have.property('size');
        transaction.should.have.property('inputIds');
        transaction.should.have.property('inputs');
        transaction.should.have.property('size');

      });
    });

    it('should fail if not given a txHash', co(function *() {
      try {
        yield wallet.getTransaction();
        throw '';
      } catch (error) {
        error.message.should.equal('Missing parameter: txHash');
      }
    }));

    it('should fail if limit is negative', co(function *() {
      try {
        yield wallet.getTransaction({ txHash: '96b2376fb0ccfdbcc9472489ca3ec75df1487b08a0ea8d9d82c55da19d8cceea', limit: -1 });
        throw '';
      } catch (error) {
        error.message.should.equal('invalid limit argument, expecting positive integer');
      }
    }));

  });

  describe('List Transfers', function() {

    let thirdTransfer;
    it('transfers', function() {
      return wallet.transfers()
      .then(function(transfers) {
        transfers.should.have.property('transfers');
        transfers.transfers.length.should.be.greaterThan(0);
        thirdTransfer = transfers.transfers[2];
      });
    });

    it('transfers with limit and nextBatchPrevId', function() {
      return wallet.transfers({ limit: 2 })
      .then(function(transfers) {
        transfers.should.have.property('transfers');
        transfers.transfers.length.should.eql(2);
        return wallet.transfers({ prevId: transfers.nextBatchPrevId });
      })
      .then(function(transfers) {
        transfers.should.have.property('transfers');
        transfers.transfers.length.should.be.greaterThan(0);
        transfers.transfers[0].id.should.eql(thirdTransfer.id);
      });
    });

    it('get a transfer by id', function() {
      return wallet.getTransfer({ id: thirdTransfer.id })
        .then(function(transfer) {
          transfer.should.have.property('coin');
          transfer.should.have.property('height');
          transfer.should.have.property('txid');
          transfer.id.should.eql(thirdTransfer.id);
        });
    });

    it('update comment', function() {
      return wallet.transfers()
      .then(function(result) {
        const params = {
          id: result.transfers[0].id,
          comment: 'testComment'
        };
        return wallet.transferComment(params);
      })
      .then(function(transfer) {
        transfer.should.have.property('comment');
        transfer.comment.should.eql('testComment');
      });
    });

    it('remove comment', function() {
      return wallet.transfers()
      .then(function(result) {
        const params = {
          id: result.transfers[0].id,
          comment: null
        };
        return wallet.transferComment(params);
      })
      .then(function(transfer) {
        transfer.should.have.property('comment');
        transfer.comment.should.eql('');
      });
    });
  });

  describe('Send Transactions', function() {
    // some of the tests will return the error "Error: transaction attempted to double spend",
    // that occurs when the same unspent is selected different transactions, this is unlikely when
    // first running the function, but if you need to run it multiple times, all unspents will
    // be selected and used for pending transactions, and the tests will fail until there are available unspents.

    before(co(function *() {
      // TODO temporarily unlocking session to fix tests. Address unlock concept in BG-322.
      yield bitgo.unlock({ otp: bitgo.testUserOTP() });
    }));

    it('should send transaction to the wallet itself with send', function() {
      return wallet.createAddress()
      .delay(3000) // wait three seconds before sending
      .then(function(recipientAddress) {
        const params = {
          amount: 0.01 * 1e8, // 0.01 tBTC
          address: recipientAddress.address,
          walletPassphrase: TestV2BitGo.V2.TEST_WALLET1_PASSCODE
        };
        return wallet.send(params);
      })
      .then(function(transaction) {
        transaction.should.have.property('status');
        transaction.should.have.property('txid');
        transaction.status.should.equal('signed');
      });
    });

    it('should send transaction with sequence Id', co(function *() {
      sequenceId = Math.random().toString(36).slice(-10);
      const recipientAddress = yield wallet.createAddress();
      const params = {
        amount: 0.01 * 1e8, // 0.01 tBTC
        address: recipientAddress.address,
        walletPassphrase: TestV2BitGo.V2.TEST_WALLET1_PASSCODE,
        sequenceId: sequenceId
      };
      const transaction = yield wallet.send(params);
      transaction.should.have.property('status');
      transaction.should.have.property('txid');
      transaction.status.should.equal('signed');
    }));

    it('should fetch a transfer by its sequence Id', co(function *() {
      const transfer = yield wallet.transferBySequenceId({ sequenceId: sequenceId });
      transfer.should.have.property('sequenceId');
      transfer.sequenceId.should.equal(sequenceId);
    }));

    it('sendMany should error when given a non-array of recipients', function() {
      return wallet.createAddress()
      .then(function(recipientAddress) {
        const params = {
          recipients: {
            amount: 0.01 * 1e8, // 0.01 tBTC
            address: recipientAddress.address
          },
          walletPassphrase: TestV2BitGo.V2.TEST_WALLET1_PASSCODE
        };
        assert.throws(function() {
          wallet.sendMany(params);
        });
      });
    });

    it('should send a transaction to the wallet itself with sendMany', function() {
      return wallet.createAddress()
      .delay(3000) // wait three seconds before sending
      .then(function(recipientAddress) {
        const params = {
          recipients: [
            {
              amount: 0.01 * 1e8, // 0.01 tBTC
              address: recipientAddress.address
            }
          ],
          walletPassphrase: TestV2BitGo.V2.TEST_WALLET1_PASSCODE
        };
        return wallet.sendMany(params);
      })
      .then(function(transaction) {
        transaction.should.have.property('status');
        transaction.should.have.property('txid');
        transaction.status.should.equal('signed');
      });
    });

    it('should prebuild a transaction to the wallet', function() {
      return wallet.createAddress()
      .delay(3000) // wait three seconds before fetching unspents
      .then(function(recipientAddress) {
        const params = {
          recipients: [
            {
              amount: 0.01 * 1e8, // 0.01 tBTC
              address: recipientAddress.address
            }
          ]

        };
        return wallet.prebuildTransaction(params);
      })
      .then(function(prebuild) {
        const explanation = basecoin.explainTransaction(prebuild);
        explanation.displayOrder.length.should.equal(6);
        explanation.outputs.length.should.equal(1);
        explanation.changeOutputs.length.should.equal(1);
        explanation.outputAmount.should.equal(0.01 * 1e8);
        explanation.outputs[0].amount.should.equal(0.01 * 1e8);
        explanation.should.have.property('fee');
        return wallet.sendMany({
          prebuildTx: prebuild,
          walletPassphrase: TestV2BitGo.V2.TEST_WALLET1_PASSCODE,
          comment: 'Hello World!',
          txHex: 'should be overwritten'
        });
      })
      .then(function(transaction) {
        transaction.should.have.property('status');
        transaction.should.have.property('txid');
        transaction.status.should.equal('signed');
      });
    });

    it('should prebuild a transaction to the wallet and manually sign and submit it', function() {
      let keychain;
      return basecoin.keychains().get({ id: wallet._wallet.keys[0] })
      .then(function(key) {
        keychain = key;
        return wallet.createAddress();
      })
      .delay(3000) // wait three seconds before fetching unspents
      .then(function(recipientAddress) {
        const params = {
          recipients: [
            {
              amount: 0.01 * 1e8, // 0.01 tBTC
              address: recipientAddress.address
            }
          ]

        };
        return wallet.prebuildTransaction(params);
      })
      .then(function(prebuild) {
        return wallet.signTransaction({
          txPrebuild: prebuild,
          key: keychain,
          walletPassphrase: TestV2BitGo.V2.TEST_WALLET1_PASSCODE,
          comment: 'Hello World!',
          txHex: 'should be overwritten'
        });
      })
      .then(function(signedTransaction) {
        return wallet.submitTransaction(signedTransaction);
      })
      .then(function(transaction) {
        transaction.should.have.property('status');
        transaction.should.have.property('txid');
        transaction.status.should.equal('signed');
      });
    });
  });

  describe('Sharing & Pending Approvals', function() {
    let sharingUserBitgo;
    let sharingUserBasecoin;
    before(function() {
      sharingUserBitgo = new TestV2BitGo({ env: 'test' });
      sharingUserBitgo.initializeTestVars();
      sharingUserBasecoin = sharingUserBitgo.coin('tbtc');
      return sharingUserBitgo.authenticateSharingTestUser(sharingUserBitgo.testUserOTP());
    });

    it('should extend invitation from main user to sharing user', function() {
      // take the main user wallet and invite this user
      let share;
      return wallet.shareWallet({
        email: TestV2BitGo.TEST_SHARED_KEY_USER,
        permissions: 'view,spend,admin',
        walletPassphrase: TestV2BitGo.V2.TEST_WALLET1_PASSCODE
      })
      .then(function(shareDetails) {
        share = shareDetails;
        return sharingUserBitgo.unlock({ otp: sharingUserBitgo.testUserOTP() });
      })
      .then(function() {
        return sharingUserBasecoin.wallets().acceptShare({
          walletShareId: share.id,
          userPassword: TestV2BitGo.TEST_SHARED_KEY_PASSWORD
        });
      })
      .then(function(acceptanceDetails) {
        acceptanceDetails.should.have.property('changed');
        acceptanceDetails.should.have.property('state');
        acceptanceDetails.changed.should.equal(true);
        acceptanceDetails.state.should.equal('accepted');
      });
    });

    it('should have sharing user self-remove from accepted wallet and reject it', function() {
      const receivedWalletId = wallet.id();
      console.log('This is received wallet ID', receivedWalletId);
      return sharingUserBasecoin.wallets().list()
      .then(function(sharedWallets) {
        const receivedWallet = _.find(sharedWallets.wallets, function(w) { return w.id() === receivedWalletId; });
        return receivedWallet.removeUser({ userId: sharingUserBitgo._user.id });
      })
      .then(function(removal) {
        // this should require a pending approval
        return basecoin.wallets().get({ id: receivedWalletId });
      })
      .then(function(updatedWallet) {
        return updatedWallet.pendingApprovals();
      })
      .then(function(pendingApprovals) {
        const pendingApproval = _.find(pendingApprovals, function(pa) { return pa.wallet.id() === receivedWalletId; });

        pendingApproval.ownerType().should.equal('wallet');
        should.exist(pendingApproval.walletId());
        should.exist(pendingApproval.state());
        should.exist(pendingApproval.creator());
        should.exist(pendingApproval.info());
        should.exist(pendingApproval.type());
        should.exist(pendingApproval.approvalsRequired());
        pendingApproval.approvalsRequired().should.equal(1);
        return pendingApproval.reject();
      })
      .then(function(approval) {
        approval.wallet.should.equal(receivedWalletId);
        approval.state.should.equal('rejected');
      });
    });

    it('should have sharing user self-remove from accepted wallet and approve it', function() {
      const receivedWalletId = wallet.id();
      return sharingUserBasecoin.wallets().list()
      .then(function(sharedWallets) {
        const receivedWallet = _.find(sharedWallets.wallets, function(w) { return w.id() === receivedWalletId; });
        return receivedWallet.removeUser({ userId: sharingUserBitgo._user.id });
      })
      .then(function(removal) {
        // this should require a pending approval
        return basecoin.wallets().get({ id: receivedWalletId });
      })
      .then(function(updatedWallet) {
        return updatedWallet.pendingApprovals();
      })
      .then(function(pendingApprovals) {
        const pendingApproval = _.find(pendingApprovals, function(pa) { return pa.wallet.id() === receivedWalletId; });
        return pendingApproval.approve({ otp: bitgo.testUserOTP() });
      })
      .then(function(approval) {
        approval.should.have.property('approvalsRequired');
        approval.should.have.property('coin');
        approval.should.have.property('creator');
        approval.should.have.property('id');
        approval.should.have.property('state');
        approval.should.have.property('userIds');
        approval.should.have.property('wallet');
        approval.state.should.equal('approved');
        approval.wallet.should.equal(receivedWalletId);
      });
    });
  });

});
