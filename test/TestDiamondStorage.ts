import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { BaseContract, Fragment, Signer } from "ethers";
import hre from "hardhat";
import { toFunctionSelector } from "viem";
import {
  DiamondInit,
  TestDiamondStorage,
} from "../types/ethers-contracts/index.js";

const { ethers, networkHelpers } = await hre.network.connect();

describe("DiamondBadStorage", async function () {
  let deployer: Signer;
  let testDiamondStorage: TestDiamondStorage;
  let diamondInit: DiamondInit;
  let diamondInitCalldata: string;

  beforeEach(async function () {
    [deployer] = await ethers.getSigners();

    // Deploy the DiamondInit contract
    diamondInit = await ethers.deployContract("DiamondInit");
    diamondInitCalldata = diamondInit.interface.encodeFunctionData("init");
    // Deploy the DiamondCutFacet contract
    const diamondCutFacet = await ethers.deployContract("DiamondCutFacet");
    // Deploy the DiamondLoupeFacet contract
    const diamondLoupeFacet = await ethers.deployContract("DiamondLoupeFacet");
    // Deploy the OwnershipFacet contract
    const ownershipFacet = await ethers.deployContract("OwnershipFacet");

    // Deploy the DiamondBadStorage contract
    testDiamondStorage = await ethers.deployContract("TestDiamondStorage", [
      [
        {
          facetAddress: diamondCutFacet.target,
          action: 0,
          functionSelectors: getSelectors(diamondCutFacet).map(
            (s) => s.selector
          ),
        },
        {
          facetAddress: diamondLoupeFacet.target,
          action: 0,
          functionSelectors: getSelectors(diamondLoupeFacet).map(
            (s) => s.selector
          ),
        },
        {
          facetAddress: ownershipFacet.target,
          action: 0,
          functionSelectors: getSelectors(ownershipFacet).map(
            (s) => s.selector
          ),
        },
      ],
      {
        owner: await deployer.getAddress(),
        init: await diamondInit.getAddress(),
        initCalldata: diamondInitCalldata,
      },
    ]);
  });

  it("The bad facets and storage setup would cause outerValue1 to be updated on writing nestedValue2", async function () {
    // Deploy the BadWriteFacetBefore contract
    let badWriteFacetBefore = await ethers.deployContract(
      "BadWriteFacetBefore"
    );
    // Cut the new facet
    let diamondCutFacet = await ethers.getContractAt(
      "DiamondCutFacet",
      testDiamondStorage.target,
      deployer
    );
    await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: badWriteFacetBefore.target,
          action: 0,
          functionSelectors: getSelectors(badWriteFacetBefore).map(
            (s) => s.selector
          ),
        },
      ],
      await diamondInit.getAddress(),
      diamondInitCalldata
    );

    // Now, set and get outerValue1
    badWriteFacetBefore = await ethers.getContractAt(
      "BadWriteFacetBefore",
      testDiamondStorage.target,
      deployer
    );

    await badWriteFacetBefore.setOuterValue1(1);
    assert.equal(await badWriteFacetBefore.getOuterValue1(), 1n);

    // Now, cut a new facet and show that the new storage update is not safe.
    // Deploy the BadWriteFacetAfter contract
    let badWriteFacetAfter = await ethers.deployContract("BadWriteFacetAfter");
    // Cut the new facet
    diamondCutFacet = await ethers.getContractAt(
      "DiamondCutFacet",
      testDiamondStorage.target,
      deployer
    );
    await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: badWriteFacetAfter.target,
          action: 0,
          functionSelectors: [
            toFunctionSelector("getNestedValue2()"),
            toFunctionSelector("setNestedValue2(uint256)"),
          ],
        },
      ],
      await diamondInit.getAddress(),
      diamondInitCalldata
    );

    // Now, set and get nestedValue2
    badWriteFacetAfter = await ethers.getContractAt(
      "BadWriteFacetAfter",
      testDiamondStorage.target,
      deployer
    );
    await badWriteFacetAfter.setNestedValue2(2);
    assert.equal(await badWriteFacetAfter.getNestedValue2(), 2n);

    // But we realise that writing to nestedValue2 also updates outerValue1.
    // This test will pass, but it's NOT WHAT WE WANT!!!! WE WANT THIS TO STAY
    // AS 1 INSTEAD.
    assert.equal(await badWriteFacetAfter.getOuterValue1(), 2n);
  });

  it("The good facets and storage setup would NOT cause outerValue1 and nestedValue2 to be updated when writing to nestedNestedValue2", async function () {
    // Deploy the GoodWriteFacetBefore contract
    let goodWriteFacetBefore = await ethers.deployContract(
      "GoodWriteFacetBefore"
    );
    // Cut the new facet
    let diamondCutFacet = await ethers.getContractAt(
      "DiamondCutFacet",
      testDiamondStorage.target,
      deployer
    );
    await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: goodWriteFacetBefore.target,
          action: 0,
          functionSelectors: getSelectors(goodWriteFacetBefore).map(
            (s) => s.selector
          ),
        },
      ],
      await diamondInit.getAddress(),
      diamondInitCalldata
    );

    // Now, set and get outerValue1 and nestedValue2
    goodWriteFacetBefore = await ethers.getContractAt(
      "GoodWriteFacetBefore",
      testDiamondStorage.target,
      deployer
    );

    await goodWriteFacetBefore.setOuterValue1(1);
    assert.equal(await goodWriteFacetBefore.getOuterValue1(), 1n);

    // ensure we set the storage slots of the first index (0) and second index (1)
    await goodWriteFacetBefore.setNestedNestedValue1(0, 1);
    assert.equal(await goodWriteFacetBefore.getNestedNestedValue1(0), 1n);

    await goodWriteFacetBefore.setNestedNestedValue1(1, 2);
    assert.equal(await goodWriteFacetBefore.getNestedNestedValue1(1), 2n);

    // Now, cut a new facet and show that the new storage update is safe.
    // Deploy the GoodWriteFacetAfter contract
    let goodWriteFacetAfter = await ethers.deployContract(
      "GoodWriteFacetAfter"
    );
    // Cut the new facet
    diamondCutFacet = await ethers.getContractAt(
      "DiamondCutFacet",
      testDiamondStorage.target,
      deployer
    );
    await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: goodWriteFacetAfter.target,
          action: 0,
          functionSelectors: [
            toFunctionSelector("getNestedNestedValue2(uint256)"),
            toFunctionSelector("setNestedNestedValue2(uint256,uint256)"),
          ],
        },
      ],
      await diamondInit.getAddress(),
      diamondInitCalldata
    );

    // Now, set and get nestedNestedValue2
    goodWriteFacetAfter = await ethers.getContractAt(
      "GoodWriteFacetAfter",
      testDiamondStorage.target,
      deployer
    );

    // write to nested nested value 2, index 0.  if this storage upgrade is safe, this should be fine to do.
    await goodWriteFacetAfter.setNestedNestedValue2(0, 3);
    assert.equal(await goodWriteFacetAfter.getNestedNestedValue2(0), 3n);

    // now read nested nested value 1, from index 1, which should still be "2"
    // since we set it to "2" above and haven't changed it since.
    // but uh-oh, this assertion fails, and shows that it's actually set to "3"
    assert.equal(await goodWriteFacetAfter.getNestedNestedValue1(1), 2n);

    // what happened?  we had an array of structs of type NestedNestedStructThatCanGrow with 1 item inside it.
    // we set the first and second index of that array, occupying the first two storage slots for the array.
    // then, we added an element to NestedNestedStructThatCanGrow (nested nested value 2).  we mutated this element at index 0 to set it to "3".
    // then, we try to read index 1 and the first element (nested nested value 1), which we have not changed, and should still be set to "2" but it's set to "3".
    // this is because when we extended the NestedNestedStructThatCanGrow and set index 0 nested nested value 2, the contract uses the same storage slot used for index 1 nested nested value 1, because storage is allocated sequentially in arrays.
    // this indicates that it's not safe to extend a struct inside an array of structs, because solidity sequentially maps memory in an array of structs.  if instead, a mapping was used, it would be safe, because mapping storage addresses are calculated by a hash of the key.  hashes produce uniformily random output, in a huge address space (2^256) which leaves a lot of "space" between these storage addresses, so, you can add elements to the struct without overwriting the next element.
  });
});

// get function selectors from ABI
export function getSelectors(contract: BaseContract): FunctionSelector[] {
  // Extract all the function fragments
  const functionFragments = contract.interface.fragments.filter(
    Fragment.isFunction
  );
  const selectors = functionFragments.map((f) => ({
    signature: f.format("minimal"),
    selector: f.selector,
  }));
  return selectors;
}

export interface FunctionSelector {
  signature: string;
  selector: string;
}
