/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');
const sample1 = require('../sample/1.2.1.4951539955100.5499100519956.9710110152525.7495249519857.9857495451975153.json');
const sample2 = require('../sample/1.2.3.4951539955100.5499100519956.9710110152525.7495249519857.9857495451975153.json');
const sample3 = require('../sample/1.2.4.4951539955100.5499100519956.9710110152525.7495249519857.9857495451975153.json');


class AssetTransfer extends Contract {

    async InitLedger(ctx) {
        const assets = [
           sample1,
           sample2,
           sample3
        ];

        for (const asset of assets) {
            // asset.docType = 'asset';
            await ctx.stub.putState(asset.uid.value, Buffer.from(JSON.stringify(JSON.stringify(asset))));
            console.log(`Assets ${asset.uid.value} initialized`);
        }
    }

    // CreateAsset issues a new asset to the world state with given details.
    async CreateAsset(ctx, id, asset) {
        return ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
    }

    // ReadAsset returns the asset stored in the world state with given id.
    async ReadAsset(ctx, id) {
        const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    // AssetExists returns true when asset with given ID exists in world state.
    async AssetExists(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    // TransferAsset updates the owner field of asset with given id in the world state.
    async TransferAsset(ctx, id, newOwner) {
        const assetString = await this.ReadAsset(ctx, id);
        let asset = JSON.parse(JSON.parse(assetString));
        asset.organization.value = newOwner;
        return ctx.stub.putState(id, Buffer.from(JSON.stringify(JSON.stringify(asset))));
    }

    // GetAllAssets returns all assets found in the world state.
    async GetAllAssets(ctx) {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(JSON.parse(strValue));
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({ Key: result.value.key, Record: record });
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

    async GetHistory(ctx, id) {
        const allResults = [];
        const iterator = await ctx.stub.getHistoryForKey(id);
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(JSON.parse(strValue));
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({ Key: result.value.key, Record: record });
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }
}

module.exports = AssetTransfer;
