# deNFT, a bridge for NFT collections over the deBridge protocol

deNFT is a set of smart contracts that aims to provide the ability to send arbitrary `ERC-721`-compliant NFTs across EVM blockchains leveraging the [deBridge low-level cross chain messaging protocol](https://debridge.finance). This set is responsible for operating NFT objects and constructing messages tailored to operate these NFTs across secondary chains using specially constructed messages, while the actual transfer of such messages is handled by the deBridge gate.

Designing deNFT we had an intention to implement two different approaches under one roof:
1. the IOU (I-owe-you, lock/wrap) approach: an object is being locked by the bridge on the origin chain, and the wrapper object is being minted on the destination chain;
2. the burn/mint approach: the object is being burned on the origin chain and the same object (with the same set of parameters) gets minted on the destination chain.

The following contracts are used in the implementation:
- `DeNftBridge`, a contract which is responsible for:
  - when sending an object to the bridge: taking it from the sender, holding in on it’s own address or burning it, constructing operational message for the target chain;
  - when receiving an object from the bridge: releasing an object (if on native chain) or minting a new one or creating a wrapped version of the original one, then sending it to the destination address;
- `DeNFT`, an in-house ERC-721-compliant implementation of an NFT collection. It is used as a master deployment authorized by `DeNftDeployer`, so that other collections (requested via `DeNftBridge`) may be deployed from the master deployment’s creationCode. It is used to create wrapper collections for wrapped objects as well as original collections for cross-chain compatible collections;
- `DeNftDeployer`, a helper contract for deploying `DeNFT` instances;
- `ERC721WithPermitUpgradable`, an abstract extension for OpenZeppelin’s `ERC721Upgradeable` contract with `EIP-4494`-compliant permits implementation (based on the reference implementation of the `EIP-4494`).

## Reference deployment

The whole set of contracts, representing the bridge, is being deployed to the following chains:
- Arbitrum One
- Avalanche
- BNB Chain
- Ethereum
- Polygon

Addresses:

|Contract|Address|
|--------|-------|
|`DeNftBridge`|`0xD132698c56B03131c64e48732690249DD50562A1`|
|`DeNftDeployer`|`0x5491102015c100f462f42817c68684d5a59fBDe7`|
|`DeNFT`|`0x423c8B7D2Eb692d1a234D697e529CA670c7105f1`|

## Definitions

**Native chain** - a chain where the original NFT collection has been originally deployed.

**Secondary chain** - a non-native chain for arbitrary NFT collection.

**Origin chain** - a chain the object is being transferred from. It may be transferred from native or from secondary chain to any other supported chain.

**Destination chain** - a chain the object is being transferred to.

**Original collection** - an arbitrary `ERC-721`-compliant NFT collection which resides on the native chain. The original collection is identified on the secondary chain by the `debridgeId`.

**Cross-chain native collection** - an original collection that has been deployed via the `DeNftBridge` from the in-house implementation to support burn/mint approach.

**`DebridgeId`** - a cross-chain identifier of the original collection. It is constructed by combining the native chain’s ID + the original collection’s address on the native chain

**Wrapper collection** - an instance of the `DeNFT` contract deployed by `DeNftBridge` on the secondary chain to reflect a specific original collection using `DebridgeId`.

## Lock/wrap (IOU) approach

The first approach is a classic “lock/wrap” technique (I-owe-you): an object (an NFT in our case) is held on its native chain by periphery contract, and a synthetic wrapper object (“wrapped NFT”) is being minted on the target chain upon transfer. This approach is applicable **for any `ERC-721`-compliant NFT collection except** those that were explicitly deployed by calling `DeNftBridge.createNFT()` method.

Worth mentioning that possible mutations of a collection on the native chain are not reflected on wrapped versions of the objects on secondary chains. However, anyone can fork the `DeNftBridge` and the DeNFT smart contracts and implement the update mechanism by themselves.

## Burn/mint approach

The second approach is technically very similar to the “lock/wrap” one, but the underlying intention was to completely burn the object on the native chain making the wrapped version a one-of-a-kind representation of the object.

To achieve this, we needed to allow the `DeNftBridge` to burn the objects residing in the collection on the native chain, but the `burn()` method is not a part of `ERC-721` standard, so we cannot rely on it. More to say, asking NFT collections’ owners to grant permission for our `DeNftBridge` contract to burn and mint objects inside theirs’ collections sounds ridiculous.

To get around this, we decided to provide a in-house `ERC-721`-compliant implementation which on one hand will give content creators the way to make their NFT collections cross-chain compatible and transferable through deNFT infrastructure using the burn/mint approach, and on the other hand have a specific way for the `DeNftBridge` contract to communicate with such collections asking them to burn objects safely when they are asked to be bridged to another chain.

This in-house `ERC-721`-compliant implementation must be requested to be deployed through the DeNftBridge contract by calling the `DeNftBridge.createNFT()` method - only collections created in such a manner will be treated as ‘cross-chain native’, leveraging the burn/mint approach. Otherwise, a collection will be handled using the classic lock/mint approach.

## Creating cross-chain native collections (applicable for burn/mint approach only)

A cross-chain native collection is a collection whose objects are burned (rather than locked) by the bridge during the transfer to another chain. Since `ERC-721` standard doesn’t define the way to burn objects, we provide an in-house implementation of the `ERC-721` standard with explicit declaration of the `burn()` and `mint()` methods which are used by the `DeNftBridge` contract.

To make sure `DeNftBridge` may safely call these methods, and protect users from undesired behavior of the collection that holds the object being bridged, `DeNftBridge` uses burn/mint approach ONLY for collections that are deployed using the creationCode of the authentic master deployment of our in-house implementation.

### Deploying a cross-chain native collection

The idea is that the content creator gets a fresh instance of cross-chain native collection by calling the `DeNftBridge.createNFT()` method. This method is needed for the following:

1. It uses the creationCode of the master deployment of our in-house `ERC-721` implementation to deploy (using the create2 opcode) a fresh instance of the collection. This ensures the collection is compatible with `DeNftBridge` and has no backdoors that may fool `DeNftBridge` while the transferred objects are being held by it on the native chain;
2. It registers the address of this instance inside the internals of the `DeNftBridge` contract as an instance whose objects must be transferred using the burn/mint approach. In other words, this registration tells the `DeNftBridge.send()` method to burn the objects rather than hold them while transferring them from the native chain.

In other words, `deNftBridge` uses burn/mint approach ONLY for (a) collections deployed from the master deployment and (b) which are registered internally in the `deNftBridge` contract and (c) a collection’s owner hasn't revoked minting rights from the bridge contract. For any other collection - either arbitrary `ERC-721` collection or even a collection that is created from the master deployment’s creationCode directly (not through the `DeNftBridge.createNFT()` call) - a classic lock/mint approach will be used instead.

### Customizing a cross-chain native collection

We understand that content creators may need more sophisticated logic inside their collections, which may be out of scope of the in-house implementation we provide. For example, they may need an extended implementation of `ERC-721` with votes. To satisfy such needs, we’ve adopted the way to keep multiple different in-house implementations so that a content creator may pick what he needs by specifying the desired type of the implementation when calling the `DeNftBridge.createNFT()` method.

The type of a collection cannot be changed after it has been deployed because the type ID is used just to dereference a specific master deployment. The given master deployment is duplicated (using the `create2` opcode) and the newly deployed collection is what the content creator obtains for his needs.

Currently, we provide only a basic in-house implementation of `ERC-721`, which is identified as `DENFT_TYPE_BASIC` and is represented by the DeNFT contract. In future we may provide more implementations, each with its own unique type and a master deployment.

Master deployments are operated through the `DeNftDeployer` contract.

The type of the original collection is always transferred to the secondary chain along with the object, so the same master deployment is used to deploy a wrapper collection every time an object is being transferred to the secondary chain for the first time.

### Managing a cross-chain native collection

It has been said that the in-house implementations provide `mint()` and `burn()` methods accessible to the `DeNftBridge`. Important to note that this is not a hard coded logic: these methods are accessible to any address marked explicitly as a minter (a minter role). When a new collection is being deployed from the in-house master deployment through the `DeNftBridge`, an address of `DeNftBridge` is added to the list of minters. However, the content creator may revoke this permission, so that `DeNftBridge` will not be able to burn or mint objects anymore. `DeNftBridge` must handle this gracefully and fallback to the classic ‘lock/mint’ approach in this case.

## Sending an object

To send an object, `DeNftBridge.send()` is being called. The `DeNftBridge` contract executes an `EIP-4494`-compliant signature (if given), then checks the residence of the NFT collection:
- if the transfer is initiated from the native chain, then:
  - If the collection is tracked internally as deployed from the in-house master deployment, AND the bridge (`DeNftBridge`) has active minter permission: the object is being burned by calling `DeNFT.burn()`
  - Otherwise, the object is being transferred to `DeNftBridge`’s own address for holding;
  - a call to `DeNftBridge.claimOrMint()` is encoded and put into a cross-chain message to be passed through deBridge infrastructure with the intention to be executed on the target chain upon receiving.
- Otherwise, the object is obviously a wrapped version of the object inside a wrapper collection controlled the `DeNftBridge` contract:
  - the object is being burned by calling `DeNFT.burn()`
  - a call to `DeNftBridge.claimOrMint()` is encoded into a cross-chain message to be passed through deBridge infrastructure with the intention to be executed on the target chain upon receiving.

It is implied that the same instance of `DeNftBridge` is already deployed on the target chain, and the address of the `DeNftBridge` instance on the target chain is stored in the `DeNftBridge`’s internal structure on the origin chain.

## Receiving an object

To receive an object on the target chain, the same `DeNftBridge` must be deployed, and its address must be explicitly set in the instance of `DeNftBridge` on every origin chain. The contract on the origin chain encodes a call to the `claimOrMint()` method. It is intended that the `claimOrMint()` method picks the correct approach to handle the incoming message:
- If the destination chain is the native chain for the collection AND the `DeNftBridge` contract holds the object with the same ID - it obviously means that the lock/mint approach has been used in the initial transfer: the contract simply releases this object and transfers it further to the receiver
- Otherwise:
  - `DeNftBridge` must check if a wrapper NFT collection (which reflects the original NFT collection from the native chain) exists in the target chain. A wrapper collection is identified by `native_chain_id` + `native_chain_collection_address`, so its existence is easily resolvable by keeping the address of the corresponding wrapper collection in the internal mapping of `DeNftBridge` on the target chain; obviously, original collections deployed by calling the `createNFT()` method are tracked the same way.
  - If this wrapper collection has not been deployed yet, `DeBridgeNFTDeployer` is asked to deploy a new instance based on the in-house master deployment. A basic type is used for arbitrary original collections and for basic in-house original collections. This new wrapper collection is initialized with the name and symbol that are being passed as a payload with every object being transferred through the bridge (so they are always available, regardless of whether the wrapper collection has been deployed or not). Since the wrapper collection is being deployed by `DeNftBridge`, it obtains the “minter” role, which allows it to mint and burn arbitrary objects.
  - A new object is being minted by calling the wrapper collection’s `mint()` method [1]. Since the `ERC-721` object is identified by `tokenId` and contains arbitrary `tokenUri`, they both are being passed from the origin chain to the target chain as a payload, so the minter is able to reproduce the object with the same `tokenId` and `tokenUri` as in the native chain.
  - Finally, the newly minted object is being transferred to the destination address.

Note-1: this `mint()` method is called either:
- on the secondary chain, so the wrapper collection is used which is based on in-house implementation and 100% works, as no one controls it outside of the deNft set of contracts. Nothing to be broken here;
- on the origin chain, which means it is the collection that has been created by calling `createNFT()` method by the content creator. HOWEVER, there can be a case when the content creator has revoked a minter role from the `deNftBridge` contract, so the bridge cannot mint the object (which is being transferred back to the origin chain) anymore. This is a known case, but we are going to address this issue with content creators who are the owners of such collections, and it is THEIR responsibility to the holders of their NFTs.

Worth mentioning that claimOrMint() expects the following data as a payload on every single transfer:
- The ID of the native chain;
- The address of the NFT collection on the native chain;
- The type id of the NFT collection on the native chain
- The `name` and the `symbol` of the NFT collection on the native chain;
- `TokenId` and `TokenUri` (which are obligatory as per `ERC-721`) of the object being transferred.
