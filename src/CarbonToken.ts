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
  MerkleMapWitness,
  MerkleMap,
  PrivateKey,
} from 'snarkyjs';

const tokenSymbol = 'MYTKN';
const initialRoot = (new MerkleMap()).getRoot();

export class CarbonTokenContract extends SmartContract {
  @state(UInt64) totalAmountInCirculation = State<UInt64>();
  // Root of the CarbonOffsetTree
  @state(Field) treeRoot = State<Field>();

  deploy(args: DeployArgs) {
    super.deploy(args);

    const permissionToEdit = Permissions.proof();

    this.account.permissions.set({
      ...Permissions.default(),
      setTokenSymbol: permissionToEdit,
      send: permissionToEdit,
      receive: permissionToEdit,
      editState: permissionToEdit,
      access: Permissions.proofOrSignature(),
    });
  }

  @method init() {
    super.init();
    this.treeRoot.set(initialRoot);
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

  @method offsetTokens(userKey: PrivateKey, amount: UInt64, reason: Field, witness: MerkleMapWitness) { //}, witness: MerkleMapWitness) {
    let userAddress = userKey.toPublicKey();

    let totalAmountInCirculation = this.totalAmountInCirculation.get();
    this.totalAmountInCirculation.assertEquals(totalAmountInCirculation);

    let newTotalAmountInCirculation = totalAmountInCirculation.sub(amount);

    // this.token.burn({
    //   address: userAddress,
    //   amount: amount,
    // });

    // // Update totalAmountInCirculation
    // this.totalAmountInCirculation.set(newTotalAmountInCirculation);

    // Update MerkleMapHere
    //this.addOffset(userAddress, amount, reason);

  }

  addOffset(userAddress: PublicKey, amount: UInt64, reason: Field, witness: MerkleMapWitness) {
    let current_root = this.treeRoot.get();
    this.treeRoot.assertEquals(current_root);


    // const [rootBefore, key] = witness.computeRootAndKey(key);

    // rootBefore.assertEquals(initialRoot, DEPOSIT_WITNESS_ERROR_MSG);
    // key.assertEquals(commitment, DEPOSIT_WITNESS_ERROR_MSG);

    // // compute the root after the deposit
    // const [rootAfter] = witness.computeRootAndKey(depositType);
  }

  @method getProofOfOffset(address: PublicKey, amount: Field, reason: Field) {
    // Access the MerkleMap and return true or false

  }
}