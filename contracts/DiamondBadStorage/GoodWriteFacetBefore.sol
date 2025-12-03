// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { LibDiamondGoodStorageBefore } from "./LibDiamondGoodStorageBefore.sol";

contract GoodWriteFacetBefore {
    function s()
        internal
        pure
        returns (LibDiamondGoodStorageBefore.DiamondGoodStorage storage)
    {
        return LibDiamondGoodStorageBefore.getStorage();
    }

    function getOuterValue1() external view returns (uint256) {
        return s().outerValue1;
    }

    function setOuterValue1(uint256 value) external {
        s().outerValue1 = value;
    }

    function getNestedValue1(uint256 index) external view returns (uint256) {
        return s().nestedStruct[index].nestedValue1;
    }

    function setNestedValue1(uint256 index, uint256 value) external {
        s().nestedStruct[index].nestedValue1 = value;
    }
    
    function getNestedValue2(uint256 index) external view returns (uint256) {
        return s().nestedStruct[index].nestedValue2;
    }

    function setNestedValue2(uint256 index, uint256 value) external {
        s().nestedStruct[index].nestedValue2 = value;
    }

    function getNestedNestedValue1(uint256 index) external view returns (uint256) {
        assert(index < s().nestedStruct[0].nestedNestedStructThatCanGrow.length);
        return s().nestedStruct[0].nestedNestedStructThatCanGrow[index].nestedNestedValue1;
    }

    function setNestedNestedValue1(uint256 index, uint256 value) external {
        if (index >= s().nestedStruct[0].nestedNestedStructThatCanGrow.length) {
            s().nestedStruct[0].nestedNestedStructThatCanGrow.push(LibDiamondGoodStorageBefore.NestedNestedStructThatCanGrow({
                nestedNestedValue1: value
            }));
        } else {
            s().nestedStruct[0].nestedNestedStructThatCanGrow[index].nestedNestedValue1 = value;
        }
    }
}