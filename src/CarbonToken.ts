import {
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Permissions,
  UInt64,
  Field,
  PublicKey,
  Signature,
  MerkleMap,
  MerkleMapWitness,
  PrivateKey,
} from 'snarkyjs';

const tokenSymbol = 'MYTKN';

export class CarbonTokenContract extends SmartContract {
  @state(UInt64) totalAmountInCirculation = State<UInt64>();
  // Root of the CarbonOffsetTree
  @state(Field) treeRoot = State<Field>();

  @method initState(initialRoot: Field) {
    this.treeRoot.set(initialRoot);
  }

  deploy(args: DeployArgs) {
    super.deploy(args);

    const permissionToEdit = Permissions.proof();

    this.account.permissions.set({
      ...Permissions.default(),
      setTokenSymbol: permissionToEdit,
      send: permissionToEdit,
      receive: permissionToEdit,
      editState: Permissions.proofOrSignature(),
      access: Permissions.proofOrSignature(),
    });
  }

  @method init() {
    super.init();
    this.account.tokenSymbol.set(tokenSymbol);
    this.totalAmountInCirculation.set(UInt64.zero);
  }

  @method mint(
    receiverAddress: PublicKey,
    amount: UInt64,
    adminSignature: Signature
  ) {
    let totalAmountInCirculation = this.totalAmountInCirculation.get();
    this.totalAmountInCirculation.assertEquals(totalAmountInCirculation);

    let newTotalAmountInCirculation = totalAmountInCirculation.add(amount);

    adminSignature
      .verify(
        this.address,
        amount.toFields().concat(receiverAddress.toFields())
      )
      .assertTrue();

    this.token.mint({
      address: receiverAddress,
      amount,
    });

    this.totalAmountInCirculation.set(newTotalAmountInCirculation);
  }

  @method sendTokens(
    senderAddress: PublicKey,
    receiverAddress: PublicKey,
    amount: UInt64
  ) {
    this.token.send({
      from: senderAddress,
      to: receiverAddress,
      amount,
    });
  }

  @method OffsetTokens(userKey: PrivateKey, amount: UInt64, reason: Field) {
    let userAddress = userKey.toPublicKey();

    let totalAmountInCirculation = this.totalAmountInCirculation.get();
    this.totalAmountInCirculation.assertEquals(totalAmountInCirculation);

    let newTotalAmountInCirculation = totalAmountInCirculation.add(amount);

    this.token.burn({
      address: userAddress,
      amount: amount,
    });

    // Update totalAmountInCirculation
    this.totalAmountInCirculation.set(newTotalAmountInCirculation);

    // Update MerkleMapHere

  }

  @method getProofOfOffset(address: PublicKey, amount: Field, reason: Field) {
    // Access the MerkleMap and return true or false
  }
}