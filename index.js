//testing with GET:
//curl -isv http://0.0.0.0:7799/p2jsvc/data/xfa_1040ez
//curl -isv http://0.0.0.0:7799/p2jsvc/data/xfa_1040a
//curl -isv http://0.0.0.0:7799/p2jsvc/data/xfa_1040

//testing with POST
//curl -isv -H "Content-Type: application/json" -X POST -d '{"folderName":"data", "pdfId":"xfa_1040ez"}' http://0.0.0.0:7799/p2jsvc
//curl -isv -H "Content-Type: application/json" -X POST -d '{"folderName":"data", "pdfId":"xfa_1040a"}' http://0.0.0.0:7799/p2jsvc
//curl -isv -H "Content-Type: application/json" -X POST -d '{"folderName":"data", "pdfId":"xfa_1040"}' http://0.0.0.0:7799/p2jsvc

'use strict';
const service = require("./lib/service");
service.start();
