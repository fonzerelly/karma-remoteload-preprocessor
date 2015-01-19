var keys = require("object-keys"),
    path = require("path"),
    fs = require("fs"),
    proxyquire  = require('proxyquire'),
    requestMock = {};
var remoteload  = proxyquire("./remoteload", {
  "request": requestMock
});

function checkFunctionDefinition (funcName) {
  it("should be defined", function () {
      expect(remoteload[funcName]).toBeDefined();
      expect(remoteload[funcName] instanceof Function).toBeTruthy();
  });
}

function partial(func /*args*/) {
  var args = Array.prototype.slice.call(arguments, 1);
  return function() {
    var localArgs = Array.prototype.slice.call(arguments);
    return func.apply(null, args.concat(localArgs));
  };
}

describe("partial", function () {
  var add = function (a, b) {
    return a + b;
  };

  it("should create thunk", function () {
    expect(partial(add) instanceof Function).toBeTruthy();
  });

  it("should store parameters", function () {
    expect(partial(add, 1)(2)).toEqual(3);
    expect(partial(add, 2, 3)()).toEqual(5);
  });

});


describe("remoteload", function() {
  describe("Pattern", function() {
    checkFunctionDefinition("Pattern");

    it("should take a RegExp as first parameter", function () {
      expect(partial(remoteload.Pattern)).toThrow();
      expect(partial(remoteload.Pattern, /(.*)/, 0)).not.toThrow();
      expect(partial(remoteload.Pattern, new RegExp(), 0)).not.toThrow();
    });

    it("should take an integer as second parameter", function () {
      expect(partial(remoteload.Pattern, /(.*)/)).toThrow();
      expect(partial(remoteload.Pattern, /(.*)/, 0)).not.toThrow();
      expect(partial(remoteload.Pattern, /(.*)/, 1.1)).toThrow();
      expect(partial(remoteload.Pattern, /(.*)/, 2)).toThrow();
      expect(partial(remoteload.Pattern, /(.*)/, 1)).not.toThrow();
      expect(partial(remoteload.Pattern, /\((.*)\)/, 2)).toThrow();
    });

    it("should create an object with the redex and the groupIndex", function () {
      var regex = new RegExp("(.*) (.*)"),
          groupIndex = 2,
          pattern = new remoteload.Pattern(regex, groupIndex);
      expect(pattern.regex).toEqual(regex);
      expect(pattern.groupIndex).toEqual(groupIndex);
    });

    describe("Pattern.execStatefully", function () {
      describe("when global", function () {
        it("should use the previously passed content if none gets passed", function () {
          var content = "AAAxBBBx",
              pattern = new remoteload.Pattern(/([^x]*)x/g, 1);
          expect(pattern.execStatefully(content)[1]).toEqual("AAA");
          expect(pattern.execStatefully()[1]).toEqual("BBB");
          expect(pattern.execStatefully()).toBeNull();
        });
      });
      describe("when local", function () {
        it("should use the previously passed content if none gets passed", function () {
          var content = "AAAxBBBx",
              pattern = new remoteload.Pattern(/([^x]*)x/, 1);
          expect(pattern.execStatefully(content)[1]).toEqual("AAA");
          expect(pattern.execStatefully()).toBeNull();
        });
      });
    });
  });

  describe("extractPatternGroup", function() {
    checkFunctionDefinition("extractPatternGroup");

    it("should accept content string as first argument", function() {
       expect(partial(remoteload.extractPatternGroup)).toThrow();
    });

    it("should accept an array of patterns", function () {
      expect(partial(remoteload.extractPatternGroup, "")).toThrow();
    });

    it("should accept only the patterntype", function () {
      expect(partial(remoteload.extractPatternGroup, "", [""])).toThrow();
      expect(partial(remoteload.extractPatternGroup, "", [new remoteload.Pattern(/(.*)/, 1)])).not.toThrow();
    });

    it("should return all occurences of pattern matches", function () {
      var firstUrl = "http://localhost:8080",
          secondUrl = "www.google.com",
          content = "load(\"" + firstUrl + "\");\n" +
                    "http.get( '" + secondUrl + "' )",
          result = remoteload.extractPatternGroup(content, [
            new remoteload.Pattern(/load\("(.*)"\);/,1),
            new remoteload.Pattern(/http.get\s*\(\s*["'](.*)["']\s*\)/, 1)
          ]);

      expect(result.length).toBe(2);
      expect(result[0]).toBe(firstUrl);
      expect(result[1]).toBe(secondUrl);
    });
  });

  describe("remoteload.createCountProxy", function () {
    beforeEach(function () {
      this.callback = function () {};
      spyOn(this, "callback");
    });
    checkFunctionDefinition("createCountProxy");

    it("should take an integer and a callback", function() {
      expect(partial(remoteload.createCountProxy)).toThrow();
      expect(partial(remoteload.createCountProxy, 1)).toThrow();
      expect(partial(remoteload.createCountProxy, 1, this.callback)).not.toThrow();
    });

    it("should return a function", function () {
      expect(remoteload.createCountProxy(1, this.callback) instanceof Function).toBeTruthy();
    });

    it("should call the call back the first time", function () {
      var proxiedCallback = remoteload.createCountProxy(1, this.callback);
      proxiedCallback();
      expect(this.callback).toHaveBeenCalled();
    });

    it("should call the callback only the second time", function () {
      var proxiedCallback = remoteload.createCountProxy(2, this.callback);
      proxiedCallback();
      expect(this.callback).not.toHaveBeenCalled();
      proxiedCallback();
      expect(this.callback).toHaveBeenCalled();
    });

    it("should return a proxy, adopting the callbacks interface", function () {
      var proxiedCallback = remoteload.createCountProxy(1, this.callback),
          param_a = 1,
          param_b = "doof";
      proxiedCallback(param_a, param_b);
      expect(this.callback).toHaveBeenCalledWith(param_a, param_b);
    });
  });

  describe("remoteload.loadUrls", function () {
    beforeEach(function() {
      this.dummyNet= {
        "http://localhost:8080/index.html": {
          mimetype: "text/html",
          content : "<h1>mydummyserver</h1>",
        },
        "http://www.google.com/logo.png": {
          mimetype: "image/png",
          content : "1337FABLE7331"
        }
      };
      this.handledUrls = [];
      var self = this;

      requestMock.get = function (url) {
        self.handledUrls.push(url);
        this._calledUrl = url;
        return this;
      };

      requestMock.on = function (event, callback) {
        expect(event).toEqual("response");
        var eventData = {
          headers: {
            "content-type": self.dummyNet[this._calledUrl].mimetype
          }
        };
        setTimeout(
            callback.bind(null, eventData),
            10
        );
        return this;
      };

      requestMock.pipe = function (stream) {
        stream.write(self.dummyNet[this._calledUrl].content);
        stream.end();
      };
    });

    it("should be defined", function (done) {
      expect(remoteload.loadUrls).toBeDefined();
      expect(remoteload.loadUrls instanceof Function).toBeTruthy();
      done();
    });
    it("should accept an array of url strings", function (done) {
      expect(partial(remoteload.loadUrls)).toThrow();
      expect(partial(remoteload.loadUrls, [1])).toThrow();
      done();
    });
    it("should accept a callback for after downloading all files", function (done) {
      expect(partial(remoteload.loadUrls, ["http://localhost:8080/index.html"])).toThrow();
      expect(partial(remoteload.loadUrls, ["http://localhost:8080/index.html"], done)).not.toThrow();
    });
    describe("usage of urls", function() {
      beforeEach(function(done) {
        var urls = keys(this.dummyNet);
        remoteload.loadUrls(urls, function () {
          done();
        });
      });
      it("should call request.get for each url", function (done) {
        var urls = keys(this.dummyNet);
        expect(this.handledUrls.length).toBe(urls.length);
        expect(this.handledUrls[0]).toEqual(urls[0]);
        expect(this.handledUrls[1]).toEqual(urls[1]);
        done();
      });
    });
    describe("callback", function () {
      beforeEach(function (done) {
        var self=this;
        self.urls = keys(self.dummyNet);
        self.result = null;
        self.error = null;
        self.callback = function(error, urlTemporaries) {
          self.result = urlTemporaries;
          self.error = error;
          done();
        };
        remoteload.loadUrls(self.urls, self.callback);
      });

      it("should provide keys representing the urls", function () {
        expect(keys(this.result).sort()).toEqual(this.urls.sort());
      });

      it("should have values of temp filenames", function () {
        var self = this;
        keys(self.result).forEach(function (url) {
          var mimetype = self.dummyNet[url].mimetype,
              suffix = mimetype.slice(mimetype.indexOf("/")+1);
              regex = new RegExp("remoteload_.*\\."+suffix);
          expect(path.basename(self.result[url])).toMatch(regex);
        });
      });


      it("should have stored the content of the url", function () {
        var self = this;
        keys(self.result).forEach(function (url) {
          var file_content = fs.readFileSync(self.result[url], "utf8");
          expect(file_content).toEqual(self.dummyNet[url].content);
        });
      });
    });
  });
});
