// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "../NFT/ERC721WithPermitUpgradable.sol";

contract MockERC721 is ERC721WithPermitUpgradable {
    mapping(uint256 => string) tokenUris;
    constructor () {
        __ERC721WithPermitUpgradable_init("Test name", "TNFT");
    }

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }

    function setTokenUri(uint256 tokenId, string calldata uri) external {
        tokenUris[tokenId] = uri;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        return tokenUris[tokenId];
    }
}
