var ui = require("./ui.js"),
    http = require("http"),
    fs = require("fs-extra");

function checkFunctionDefinition (funcName) {
  it("should be defined", function () {
      expect(ui[funcName]).toBeDefined();
      expect(ui[funcName] instanceof Function).toBeTruthy();
  });
}

describe("ui", function () {
  describe("createRemoteLoader", function () {
    beforeEach(function () {
      this.logger = jasmine.createSpyObj('logger', ['info', 'warn', 'error']);
    });

    checkFunctionDefinition("createRemoteLoader");

    // describe("configuration", function () {
    //   it("should report missing patterns", function () {
    //     ui.createRemoteLoader({}, this.logger);
    //     expect(this.logger.error).toHaveBeenCalledWith(
    //
    //   });
    // });
    describe("callback", function () {
      beforeEach(function () {
        this.path = ".fixtures_uispec"
        this.server = http.createServer(function (req, response) {
          var out = "<h1>hello world</h1>";
          response.writeHead(200, {"Content-Type": "text/html"});
          response.end(out);
        });
        this.server.listen(1337);
        this.config = {
          patterns: [
            {
              regex: /loadFixtures\("([^"]*)"\);/,
              groupIndex: 1,
              substitute: 'loadFixtures("%RESOURCE%");'
            }
          ],
          dir: this.path
        };
        this.remoteloadCb = ui.createRemoteLoader(this.config, this.logger);
        this.file = {};
      });
      afterEach(function () {
        this.server.close();
        fs.removeSync(this.path);
      });

      it("should call passed callback", function (done) {
        var content = "nothing to replace",
            cb = jasmine.createSpy("done").andCallFake(function() { done(); });

        this.remoteloadCb(content, this.file, cb);
        expect(cb).toHaveBeenCalledWith(content);
      });
      it("should call apply config.patterns", function (done) {
        var content = 'loadFixtures("http://localhost:1337/index.html");',
            cb = jasmine.createSpy("done").andCallFake(function (content) {
              var expectedPath = /loadFixtures\("\.fixtures_uispec\/remoteload.*\.html"\);/;
              expect(content).toMatch(expectedPath);
              done();
            });

        this.remoteloadCb(content, this.file, cb);
      });
    });
  });
})
