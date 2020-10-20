/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';
// imports
const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('../../test-application/javascript/AppUtil.js');
const express = require('express');
var cors = require('cors')
var app = express();
app.use(express.json());
app.use(cors());
var mysql = require('mysql');
var md5 = require('md5')

// global vars
const channelName = 'mychannel';
const chaincodeName = 'mychaincode';
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');

var gateway = null
var network = null
var contract = null
var tokens = []
var active = []

function auth(username, password) {
	var connection = mysql.createConnection({
		host     : 'localhost',
		user     : 'root',
		password : 'password',
		database : 'identity'
	});

    return new Promise(function (resolve, reject) {
        connection.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], function(err, data){
			connection.end()
			if (err) {
                reject(err);
            } else if (data.length === 0){
                resolve([]);
            } else {
				resolve(data)
			}
        });
    });
}

function newUser(username, password, organization) {
	var connection = mysql.createConnection({
		host     : 'localhost',
		user     : 'root',
		password : 'password',
		database : 'identity'
	});

	var encrypted = md5(password)

	return new Promise(function (resolve, reject) {
        connection.query('SELECT * FROM users WHERE username = ? ', [username], function(err, data){
			if (err) {
                reject(err);
            } else if (data.length === 0){
				connection.query("INSERT INTO users (username, password, organization) VALUES (?, ?, ?)", 
					[username, encrypted, organization], 
					function(err, data){
						connection.end()
						if (err) reject(err);
						resolve(0)
					}
				);	
            } else {
			 	resolve(1)
			}
        });
    });
}

function getOrgs () {
	var connection = mysql.createConnection({
		host     : 'localhost',
		user     : 'root',
		password : 'password',
		database : 'identity'
	});

	return new Promise(function (resolve, reject) {
        connection.query('SELECT * FROM organizations;', function(err, data){
			connection.end()
			if (err) {
                reject(err);
            } else if (data.length === 0){
                resolve([]);
            } else {
				resolve(data)
			}
        });
    });
}

function getToken () {
   var result = '';
   var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < 32; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

function getCaseNumber () {
	const len = [1, 1, 1, 13, 13, 13, 13, 16]
	var result = '';
	for (let k = 0; k < len.length; k++) {
		var characters = '0123456789';
		var charactersLength = characters.length;
		for ( var i = 0; i < len[k]; i++ ) {
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
		if (k < len.length - 1) {
			result += '.'
		}
	}
	return result;
}

async function init() {	
	try {
		// build an in memory object with the network configuration (also known as a connection profile)
		const ccp = buildCCPOrg1();

		// build an instance of the fabric ca services client based on
		// the information in the network configuration
		const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

		// setup the wallet to hold the credentials of the application user
		const wallet = await buildWallet(Wallets, walletPath);

		// in a real application this would be done on an administrative flow, and only once
		await enrollAdmin(caClient, wallet, mspOrg1);

		gateway = new Gateway();

		try {
			await gateway.connect(ccp, {
				wallet,
				identity: 'admin',
				discovery: { enabled: true, asLocalhost: true } 
			}); // using asLocalhost as this gateway is using a fabric network deployed locally

			// Build a network instance based on the channel where the smart contract is deployed
			network = await gateway.getNetwork(channelName);

			// Get the contract from the network.
			contract = network.getContract(chaincodeName);
			
			const result = await contract.submitTransaction('InitLedger');
			console.log(result)
			
		} finally {
			return 0
		}
	} catch (error) {
		console.error(`******** FAILED to run the application: ${error}`);
		return -1
	} 
}
async function reg(username, password, organization) {	
	try {
		// build an in memory object with the network configuration (also known as a connection profile)
		const ccp = buildCCPOrg1();

		// build an instance of the fabric ca services client based on
		// the information in the network configuration
		const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

		// setup the wallet to hold the credentials of the application user
		const wallet = await buildWallet(Wallets, walletPath);

		// in a real application this would be done only when a new user was required to be added
		// and would be part of an administrative flow
		await registerAndEnrollUser(caClient, wallet, mspOrg1, username, 'org1.department1');

		var result = await newUser(username, password, organization);

		if (result === 0) 
			return 0;
		else 
			return 1;
	} catch (error) {
		console.error(`******** FAILED to run the application: ${error}`);
		return -1
	} 
}

async function connect(username) {	
	try {
		const ccp = buildCCPOrg1();
		const wallet = await buildWallet(Wallets, walletPath);
		gateway = new Gateway();

		try {
			await gateway.connect(ccp, {
				wallet,
				identity: username,
				discovery: { enabled: true, asLocalhost: true }
			});  // using asLocalhost as this gateway is using a fabric network deployed locally

			// Build a network instance based on the channel where the smart contract is deployed
			network = await gateway.getNetwork(channelName);

			// Get the contract from the network.
			contract = network.getContract(chaincodeName);
			
			
		} finally {
			return 0
		}
	} catch (error) {
		console.error(`******** FAILED to run the application: ${error}`);
		return -1
	} 
}

app.get('/init', async (req,res)=>{
	let response = await init();
	await reg('newUser', 'password', 'QEH');
	await reg('doctorX', 'password', 'UCH');
	if (response === 0){
		res.send({
			code: 0,
			msg: 'Init'
		});
	}
});

/* app.post('/register', async (req,res)=>{
	console.log("registrating")
	var body = req.body
	let response = await reg(body.username, body.password, body.organization);
	if (response === 0){
		res.send({
			code: 0,
			msg: 'Registered'
		});
	} else if (response === 1){
		res.send({
			code: 1,
			msg: 'User already registered'
		});
	} else {
		res.send({
			code: -1,
			msg: 'Registration failed'
		});
	}
}); */

app.post('/login', async (req, res)=> {
	console.log("Logging in")
	var body = req.body;
	var result = await auth(body.username, body.password);
	// console.log(result)
	if (result.length !== 0){
		res.send({
			code: 0,
			org: result[0].organization,
			msg: 'Logged in'
		});
	} else {
		res.send({
			code: -1,
			msg: 'Authentication Failed'
		});
	}
});

app.post('/connect', async (req, res)=> {
	console.log("connecting")
	var body = req.body;
	var result = await auth(body.username, body.password);
	if (result.length !== 0){
		let t = getToken();
		let response = await connect(body.username);
		if (response === 0) {
			if(active.includes(body.username)) {
				let n = active.indexOf(body.username)
				tokens.splice(n, 1, t)
			} else {
				active.push(body.username)
				tokens.push(t)
			}

			res.send({
				code: 0,
				token: t,
				msg: 'Connected'
			});
		} else {
			res.send({
				code: 1,
				msg: 'Connection to chain failed'
			});
		}
	} else {
		res.send({
			code: -1,
			msg: 'Authentication Failed'
		});
	}
});

app.post('/query', async (req, res)=> {
	console.log("querying")
	var body = req.body
	if (tokens.includes(body.token)) {
		try {
			var result = await contract.evaluateTransaction('ReadAsset', body.key);
			let n = tokens.indexOf(body.token);
			tokens.splice(n, 1);
			active.splice(n, 1);
			res.send({
				code: 0,
				msg: "query ok",
				data: JSON.parse(JSON.parse(result.toString()))
			});
		} catch (e) {
			res.send({
				code: 3,
				msg: e.message
			});
		}
	} else {
		res.send({
			code: 2,
			msg: 'invalid token'
		});
	}
});

app.post('/insert', async (req, res)=> {
	console.log("inserting")
	var body = req.body
	var uuid = ''

	if ((body.key === undefined || body.key === null) && tokens.includes(body.token)) {
		
		uuid = getCaseNumber();
		body.data.uid.value = uuid
		body.data.versions.uid.value = uuid + '::' + body.data.versions.commit_audit.system_id + '::1'
		
		try{
			let n = tokens.indexOf(body.token);
			tokens.splice(n, 1);
			active.splice(n, 1);

			await contract.submitTransaction('CreateAsset', uuid, JSON.stringify(body.data));
			res.send({
				code: 0,
				msg: "inserted",
				uuid: uuid
			});
		} catch (e) {

		}
	} else if (tokens.includes(body.token)) {
		try {
			let n = tokens.indexOf(body.token);
			tokens.splice(n, 1);
			active.splice(n, 1);

			var data = null;
			var r = await contract.evaluateTransaction('ReadAsset', body.key);// throw err for new asset creation
			data = JSON.parse(JSON.parse(r.toString()))

			if (data.organization.value === body.data.organization.value) {
				await contract.submitTransaction('CreateAsset', body.key, JSON.stringify(body.data));
				res.send({
					code: 0,
					msg: "inserted"
				});
			} else {
				res.send({
					code: 1,
					msg: "insert failed"
				});
			}
		} catch (e) {
			
		}
	} else {
		res.send({
			code: 2,
			msg: 'invalid token'
		});
	}
});

app.post('/getOrgs', async (req, res)=> {
	console.log('getting organizations')
	var body = req.body
	if (tokens.includes(body.token)) {
		let n = tokens.indexOf(body.token);
		tokens.splice(n, 1);
		active.splice(n, 1);
		const orgs = await getOrgs()
		res.send({
			code: 0,
			data: orgs,
			msg: 'got organizations'
		});
	} else {
		res.send({
			code: 2,
			msg: 'invalid token'
		});
	}
});

app.post('/transfer', async (req, res)=> {
	console.log("transferring")
	var body = req.body

	if (tokens.includes(body.token)) {
		try {
			var result = await contract.submitTransaction('TransferAsset', body.key, body.newOwner);
			let n = tokens.indexOf(body.token);
			tokens.splice(n, 1);
			active.splice(n, 1);
			res.send({
				code: 0,
				msg: "Transferred Case"
			});
		} catch (e) {
			res.send({
				code: 5,
				msg: e.message
			});
		}
	} else {
		res.send({
			code: 2,
			msg: 'invalid token'
		});
	}
});

app.post('/history', async (req, res)=> {
	console.log("getting history")
	var body = req.body

	if (tokens.includes(body.token)) {
		try {
			var result = await contract.evaluateTransaction('GetHistory', body.key);
			let n = tokens.indexOf(body.token);
			tokens.splice(n, 1);
			active.splice(n, 1);
			res.send({
				code: 0,
				msg: "got asset history",
				data: JSON.parse(result.toString())
			});
		} catch (e) {
			res.send({
				code: 5,
				msg: e.message
			});
		}
	} else {
		res.send({
			code: 2,
			msg: 'invalid token'
		});
	}
});

app.post('/allAsset', async (req, res)=> {
	console.log("getting assets")
	var body = req.body

	if (tokens.includes(body.token)) {
		try {
			var result = await contract.evaluateTransaction('GetAllAssets');
			let n = tokens.indexOf(body.token);
			tokens.splice(n, 1);
			active.splice(n, 1);
			res.send({
				code: 0,
				msg: "got assets",
				data: JSON.parse(result.toString())
			});
		} catch (e) {
			res.send({
				code: 5,
				msg: e.message
			});
		}
	} else {
		res.send({
			code: 2,
			msg: 'invalid token'
		});
	}
});

app.listen(9000, ()=>{
	console.log('listening on port 9000...')
})
