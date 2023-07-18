import { CarbonTokenContract } from './CarbonToken.js';
import { Mina, PrivateKey, PublicKey, AccountUpdate, UInt64, Signature, TokenId, Field, Poseidon, MerkleMap } from 'snarkyjs';

/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = false;



describe('CarbonToken', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: CarbonTokenContract,
    tokenId: Field;

  beforeAll(async () => {
    if (proofsEnabled) await CarbonTokenContract.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: senderKey, publicKey: senderAccount } =
      Local.testAccounts[1]);
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new CarbonTokenContract(zkAppAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy({ zkappKey: zkAppPrivateKey });
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();

    tokenId = zkApp.token.id;
  }

  it('generates and deploys the smart contract', async () => {
    await localDeploy();
    const updatedTotalAmountInCirculation = zkApp.totalAmountInCirculation.get();
    expect(updatedTotalAmountInCirculation).toEqual(UInt64.from(0));
  });


  it('can mint token with app signature and update totalAmountInCirculation', async () => {
    await localDeploy();

    const mintAmount = UInt64.from(100_000);
    let tx =
      await Mina.transaction(deployerAccount, () => {
        AccountUpdate.fundNewAccount(deployerAccount);

        const mintSignature = Signature.create(
          zkAppPrivateKey,
          mintAmount.toFields().concat(zkAppAddress.toFields())
        );
        zkApp.mint(zkAppAddress, mintAmount, mintSignature);
        zkApp.requireSignature();
      });
    await tx.prove();
    await tx.sign([deployerKey, zkAppPrivateKey]).send();

    expect(zkApp.totalAmountInCirculation.get()).toEqual(mintAmount);
    expect(
      Mina.getBalance(zkAppAddress, tokenId).value.toBigInt()
    ).toEqual(100_000n);
  });

  it('can offset Carbon tokens with a reason', async () => {
    await localDeploy();

    let map = new MerkleMap();
    var leaves: { [name: string]: string } = {};

    const mintAmount = UInt64.from(100_000);

    // Mint
    let tx =
      await Mina.transaction(deployerAccount, () => {
        AccountUpdate.fundNewAccount(deployerAccount);


        const mintSignature = Signature.create(
          zkAppPrivateKey,
          mintAmount.toFields().concat(senderAccount.toFields())
        );

        zkApp.mint(senderAccount, mintAmount, mintSignature);
        zkApp.requireSignature();
      });
    await tx.prove();
    await tx.sign([deployerKey, zkAppPrivateKey]).send();

    // Offset
    const burnAmount = UInt64.from(10_000);
    let account = Mina.getAccount(senderAccount);
    console.log(account.balance.toBigInt());
    tx =
      await Mina.transaction(senderAccount, () => {
        let reason = Field.from(1);
        let key = Poseidon.hash(senderAccount.toFields().concat(burnAmount.toFields()).concat(reason.toFields()));
        let witness = map.getWitness(key);


        zkApp.offsetTokens(senderKey, burnAmount, reason, witness);

        // Update offchain map
        map.set(key, Field.from(1))
        leaves[key.toString()] = '1';

      });

    await tx.prove();
    console.log(tx.toPretty());
    await tx.sign([senderKey]).send();
    expect(
      Mina.getBalance(senderAccount, tokenId).value.toBigInt()
    ).toEqual(90_000n);

  });



});
