var keys = require("object-keys"),
    path = require("path"),
    fs = require("fs-extra"),
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
    var __MARKER__ = remoteload.Pattern.prototype.__GET_MARKER__();
    var boundConstructor = remoteload.Pattern.bind(remoteload.Pattern.prototype);
    checkFunctionDefinition("Pattern");

    it("should take a RegExp as first parameter", function () {
      expect(partial(boundConstructor)).toThrow();
      expect(partial(boundConstructor, /(.*)/, 0, __MARKER__)).not.toThrow();
      expect(partial(boundConstructor, new RegExp(), 0, __MARKER__)).not.toThrow();
    });

    it("should take an integer as second parameter", function () {
      expect(partial(boundConstructor, /(.*)/)).toThrow();
      expect(partial(boundConstructor, /(.*)/, 0, __MARKER__)).not.toThrow();
      expect(partial(boundConstructor, /(.*)/, 1.1)).toThrow();
      expect(partial(boundConstructor, /(.*)/, 2)).toThrow();
      expect(partial(boundConstructor, /(.*)/, 1, __MARKER__)).not.toThrow();
      expect(partial(boundConstructor, /\((.*)\)/, 2)).toThrow();
    });

    it("should take a string containing a marker as third parameter", function () {
      expect(partial(boundConstructor, /(.*)/, 1)).toThrow();
      expect(partial(boundConstructor, /(.*)/, 1, "")).toThrow();
      expect(partial(boundConstructor, /(.*)/, 1, __MARKER__)).not.toThrow();
    });

    it("should create an object with the redex, the groupIndex and the substitute", function () {
      var regex = new RegExp("(.*) (.*)"),
          groupIndex = 2,
          substitute = __MARKER__,
          pattern = new remoteload.Pattern(regex, groupIndex, substitute);
      expect(pattern.regex).toEqual(regex);
      expect(pattern.groupIndex).toEqual(groupIndex);
      expect(pattern.substitute).toEqual(substitute);
    });

    describe("Pattern.execStatefully", function () {
      var __MARKER__ = remoteload.Pattern.prototype.__GET_MARKER__();
      describe("when global", function () {
        it("should use the previously passed content if none gets passed", function () {
          var content = "AAAxBBBx",
              pattern = new remoteload.Pattern(/([^x]*)x/g, 1, __MARKER__);
          expect(pattern.execStatefully(content)[1]).toEqual("AAA");
          expect(pattern.execStatefully()[1]).toEqual("BBB");
          expect(pattern.execStatefully()).toBeNull();
        });
      });
      describe("when local", function () {
        it("should use the previously passed content if none gets passed", function () {
          var content = "AAAxBBBx",
              pattern = new remoteload.Pattern(/([^x]*)x/, 1, __MARKER__);
          expect(pattern.execStatefully(content)[1]).toEqual("AAA");
          expect(pattern.execStatefully()).toBeNull();
        });
      });
    });
    describe("Pattern.applyInSubst", function () {
      var __MARKER__ = remoteload.Pattern.prototype.__GET_MARKER__();
      it("should return the substituion applied with the passed parameter", function () {
        var pattern = new remoteload.Pattern(/(.*)/, 1, "Homer Simpson: \"%RESOURCE%\"");
        expect(pattern.applyInSubst("Dough")).toEqual("Homer Simpson: \"Dough\"");
      });
    });
  });

  describe("extractPatternGroup", function() {
    var __MARKER__ = remoteload.Pattern.prototype.__GET_MARKER__();
    checkFunctionDefinition("extractPatternGroup");

    it("should accept content string as first argument", function() {
       expect(partial(remoteload.extractPatternGroup)).toThrow();
    });

    it("should accept an array of patterns", function () {
      expect(partial(remoteload.extractPatternGroup, "")).toThrow();
    });

    it("should accept only the patterntype", function () {
      expect(partial(remoteload.extractPatternGroup, "", [""])).toThrow();
      expect(partial(remoteload.extractPatternGroup, "", [new remoteload.Pattern(/(.*)/, 1, __MARKER__)])).not.toThrow();
    });

    it("should return all occurences of pattern matches", function () {
      var firstUrl = "http://localhost:8080",
          secondUrl = "www.google.com",
          content = "load(\"" + firstUrl + "\");\n" +
                    "http.get( '" + secondUrl + "' )",
          result = remoteload.extractPatternGroup(content, [
            new remoteload.Pattern(/load\("(.*)"\);/,1, __MARKER__),
            new remoteload.Pattern(/http.get\s*\(\s*["'](.*)["']\s*\)/, 1, __MARKER__)
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
      this.path = "fixtures";
      fs.mkdirSync(this.path);
      this.dummyNet= {
        "http://localhost:8080/index.html": {
          mimetype: "text/html; charset=utf-8",
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
    afterEach(function() {
      fs.removeSync(this.path);
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
    it("should accept a target directory", function (done) {
      expect(partial(remoteload.loadUrls, ["url"])).toThrow();
      done();
    });
    it("should accept a callback for after downloading all files", function (done) {
      expect(partial(remoteload.loadUrls, ["http://localhost:8080/index.html"], this.path)).toThrow();
      done();
    });
    it("should work with all parameters", function(done) {
      expect(partial(remoteload.loadUrls, ["http://localhost:8080/index.html"], this.path, done)).not.toThrow();
    });
    describe("usage of urls", function() {
      beforeEach(function(done) {
        var urls = keys(this.dummyNet);
        remoteload.loadUrls(urls, this.path, function () {
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
        remoteload.loadUrls(self.urls, self.path, self.callback);
      });

      it("should provide keys representing the urls", function () {
        expect(keys(this.result).sort()).toEqual(this.urls.sort());
      });

      it("should have values of temp filenames", function () {
        var self = this;
        keys(self.result).forEach(function (url) {
          var mimetype = self.dummyNet[url].mimetype,
              indexSemicolon = mimetype.indexOf(";"),
              suffixEnd = indexSemicolon > 0 ? indexSemicolon : mimetype.length,
              suffix = mimetype.slice(mimetype.indexOf("/")+1, suffixEnd);
              regex = new RegExp("remoteload_.*\\."+suffix+"$");
          expect(path.basename(self.result[url])).toMatch(regex);
        });
      });

      it("should store temp files in the targetDir", function () {
        var self = this;
        keys(self.result).forEach(function (url) {
          expect(path.dirname(self.result[url])).toEqual(self.path);
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

  describe("modifyContent", function() {
    beforeEach(function() {
      this.firstUrl = "http://localhost:8080";
      this.secondUrl = "www.google.com";
      this.loadHead = "load(\"";
      this.loadTail = "\");\n";
      this.httpHead = "http.get(\"";
      this.httpTail = "\")\n";
      this.content = "blah blah blah\n" +
                     this.loadHead + this.firstUrl + this.loadTail +
                     this.httpHead + this.secondUrl + this.httpTail +
                     "rabarba rabarba rabarba";
      var __MARKER__ = remoteload.Pattern.prototype.__GET_MARKER__();
      this.patterns = [
        new remoteload.Pattern(
          /load\("(.*)"\);/,
          1,
          "load(\"" + __MARKER__+"\");"
        ),
        new remoteload.Pattern(
          /http.get\s*\(\s*["'](.*)["']\s*\)/,
          1,
          "http.get(\"" + __MARKER__ + "\")"
        )
      ];
      this.urlTemporaries = {};
      this.urlTemporaries[this.firstUrl] = "1234.html";
      this.urlTemporaries[this.secondUrl] =  "5678.html";
      this.awaitedResult = "blah blah blah\n" +
                           this.loadHead + this.urlTemporaries[this.firstUrl] + this.loadTail +
                           this.httpHead + this.urlTemporaries[this.secondUrl] + this.httpTail +
                           "rabarba rabarba rabarba";
    });

    checkFunctionDefinition("modifyContent");

    it("should accept content", function () {
      expect(partial(remoteload.modifyContent)).toThrow();
    });

    it("should accept a Pattern", function () {
      expect(partial(remoteload.modifyContent, this.content)).toThrow();
    });

    it("should accept an object of urls and temporaries", function() {
      expect(partial(remoteload.modifyContent, this.content, this.patterns)).toThrow();
    });

    it("should return content with exchanged patterns", function () {
      var result = remoteload.modifyContent(
        this.content,
        this.patterns,
        this.urlTemporaries
      );
      expect(result).toEqual(this.awaitedResult);
    });

  });
});
