var keys = require("object-keys"),
    path = require("path"),
    proxyquire  = require('proxyquire'),
    requestMock = {};
var remoteload  = proxyquire("./remoteload", {
  "request": requestMock
});

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
    it("should be defined", function () {
      expect(remoteload.Pattern).toBeDefined();
      expect(remoteload.Pattern instanceof Function).toBeTruthy();
    });

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
    it("should be defined", function () {
      expect(remoteload.extractPatternGroup).toBeDefined();
      expect(remoteload.extractPatternGroup instanceof Function).toBeTruthy();
    });

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
      };
    });

    it("should be defined", function () {
      expect(remoteload.loadUrls).toBeDefined();
      expect(remoteload.loadUrls instanceof Function).toBeTruthy();
    });
    it("should accept an array of url strings", function () {
      expect(partial(remoteload.loadUrls)).toThrow();
      expect(partial(remoteload.loadUrls, [1])).toThrow();
    });
    it("should accept a callback for after downloading all files", function () {
      expect(partial(remoteload.loadUrls, ["http://localhost:8080/index.html"])).toThrow();
      expect(partial(remoteload.loadUrls, ["http://localhost:8080/index.html"], function () {})).not.toThrow();
    });
    it("should call request.get for each url", function () {
      var urls = keys(this.dummyNet);
      remoteload.loadUrls(urls, function () {});
      expect(this.handledUrls.length).toBe(urls.length);
      expect(this.handledUrls[0]).toEqual(urls[0]);
      expect(this.handledUrls[1]).toEqual(urls[1]);
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
        expect(keys(this.result)).toEqual(this.urls);
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
    });
  });
});
