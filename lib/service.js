'use strict';

const fsPromises = require('fs').promises;

let nodeUtil = require("util"),
    restify = require('restify'),
    _ = require('underscore'),
    SvcResponse = require('./svcresponse'),
    SvcContext = require("./svccontext"),
    PFParser = require("pdf2json");

let PDFFORMService = (function () {
    // private static
    let _nextId = 1;
    const _name = 'PDFFORMServer';

    // constructor
    const cls = function () {
        // private, only accessible within this constructor
        const _id = _nextId++;
        const _version = "0.0.1";

        // public (every instance will have their own copy of these methods, needs to be lightweight)
        this.get_id = function () {
            return _id;
        };
        this.get_name = function () {
            return _name + _id;
        };
        this.get_version = function () {
            return _version;
        };
        this.set_parser = function(parser) {
            this._parser = parser;
        }
        this.get_parser = function(parser) {
            return this._parser;
        }
    };

    // public static
    cls.get_nextId = function () {
        return _name + _nextId;
    };

    //private
    const _onPFBinDataReady = function (context, evtData) {

        nodeUtil.log(this.get_name() + " completed response.");

        let pdfFilePath = context.tempFilePath;

        const resData = new SvcResponse(200, "OK", pdfFilePath, "FormImage JSON");

        resData.Pages = recurseTextOnly(evtData);
        resData.Meta = evtData.Meta;

        context.completeResponse(resData);
        context.destroy();
        evtData = null;

        fsPromises.unlink(pdfFilePath);
    };

    function recurseTextOnly(data) {
        return data.Pages.map(page => {
            return {
                Width: page.Width,
                Height: page.Height,
                Texts: page.Texts.map(reduceTextEntry),
                Fields: page.Fields.map(reduceFieldsEntry)
            };
        });
    }

    function reduceTextEntry(textEntry) {
        return {
            x: textEntry.x,
            y: textEntry.y,
            w: textEntry.w,
            text: textEntry.R?.map(it => decodeURIComponent(it.T).trim())?.join(" ")
        };
    }

    function reduceFieldsEntry(fieldsEntry) {
        return {
            id: fieldsEntry.id?.Id,
            x: fieldsEntry.x,
            y: fieldsEntry.y,
            w: fieldsEntry.w,
            value: fieldsEntry.V
        };
    }

    const _onPFBinDataError = function (context, evtData) {
        nodeUtil.log(this.get_name() + " 500 Error: " + JSON.stringify(evtData.data));
        evtData.context.completeResponse(new SvcResponse(500, JSON.stringify(evtData.data)));

        evtData.destroy();
        evtData = null;

        fsPromises.unlink(context.tempFilePath);
    };

    const _customizeHeaders = function (res) {
        // Resitify currently has a bug which doesn't allow you to set default headers
        // This headers comply with CORS and allow us to server our response to any origin
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        res.header("Cache-Control", "no-cache, must-revalidate");
    };

    // public (every instance will share the same method, but has no access to private fields defined in constructor)
    cls.prototype.start = function () {
        const self = this;

        const _postFilter = function (svcContext) {
            const req = svcContext.req;

            let filePath = svcContext.tempFilePath;

            nodeUtil.log(self.get_name() + " received request:" + req.method + ":" + filePath);

            const pdfParser = new PFParser(svcContext);

            _customizeHeaders(svcContext.res);

            self.set_parser(pdfParser);

            pdfParser.on("pdfParser_dataReady", _.bind(_onPFBinDataReady, self, svcContext));
            pdfParser.on("pdfParser_dataError", _.bind(_onPFBinDataError, self, svcContext));

            pdfParser.loadPDF(filePath);
        };


        const server = restify.createServer({
            name: self.get_name(),
            version: self.get_version()
        });

        server.use(restify.plugins.acceptParser(server.acceptable));
        server.use(restify.plugins.authorizationParser());
        server.use(restify.plugins.dateParser());
        server.use(restify.plugins.queryParser());
        server.use(restify.plugins.bodyParser());
        server.use(restify.plugins.jsonp());
        server.use(restify.plugins.gzipResponse());
        server.pre(restify.pre.userAgentConnection());

        server.post('/upload', (request, response, next) => {
            try {
                for (let key in request.files) {
                    if (request.files.hasOwnProperty(key)) {
                        let tempFilePath = request.files[key].path;
                        console.log(`File: ${key} Path: ${tempFilePath}`);

                        _postFilter(new SvcContext(request, response, next, tempFilePath), tempFilePath);
                    }
                }
            } catch (e) {
                console.error(e);
                next(e);
            }
        });

        server.get('/p2jsvc/status', function (req, res, next) {
            const jsObj = new SvcResponse(200, "OK", server.name, server.version);
            res.send(200, jsObj);
            return next();
        });

        server.listen(7799, function () {
            nodeUtil.log(nodeUtil.format('%s listening at %s', server.name, server.url));
        });
    };

    return cls;
})();

module.exports = new PDFFORMService();



