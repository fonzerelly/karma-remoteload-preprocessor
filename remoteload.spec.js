var remoteload = require("./remoteload");

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
      // describe("when global", function () {
      //   it("should use the previously passed content if none gets passed", function () {
      //     var content = "AAAxBBBx",
      //         pattern = new remoteload.Pattern(/([^x]*)x/g, 1);
      //     expect(pattern.execStatefully(content)[1]).toEqual("AAA");
      //     expect(pattern.execStatefully()[1]).toEqual("BBB");
      //     expect(pattern.execStatefully()).toBeNull();
      //   });
      // });
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
});
