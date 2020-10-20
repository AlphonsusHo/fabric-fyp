# fabric-fyp

A Blockchain back-end for ehrs based on Hyperledger Fabric version 2.2, for the purpose of Master Project

## How to start the testing environment?
clone the original Hyperledger Fabric 2.2.0 docker images.

```curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.2.0 1.4.8 ```

Then export the path of the binaries

```export PATH=/home/<your username>/fabric-fyp/bin:$PATH```

Bring up the network and start the back-end

```
$ cd fabric-fyp/test-network
$ sudo bash network.sh up createChannel -ca\
$ sudo bash network.sh deployCC -ccn mychaincode -ccp ../asset-transfer-basic/chaincode-javascript -ccv 1 -ccl javascript
```
The back-end should start without errors

Next, start the application API server

``` 
$ cd ../asset-transfer-basic/application-javascript
$ node app.js
```
