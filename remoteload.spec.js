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
    });

    it("should create an object with the redex and the groupIndex", function () {
      var regex = new RegExp("(.*) (.*)"),
          groupIndex = 2,
          pattern = new remoteload.Pattern(regex, groupIndex);
      expect(pattern.regex).toEqual(regex);
      expect(pattern.groupIndex).toEqual(groupIndex);
    });
  });

  describe("extractUrls", function() {
    it("should be defined", function () {
      expect(remoteload.extractUrls).toBeDefined();
      expect(remoteload.extractUrls instanceof Function).toBeTruthy();
    });

    it("should accept content string as first argument", function() {
       expect(partial(remoteload.extractUrls)).toThrow();
    });

    it("should accept an array of patterns", function () {
      expect(partial(remoteload.extractUrls, "")).toThrow();
    });

    it("should accept only the patterntype", function () {
      expect(partial(remoteload.extractUrls, "", [""])).toThrow();
      expect(partial(remoteload.extractUrls, "", [new remoteload.Pattern(/(.*)/, 1)])).not.toThrow();
    });

    // it("should return all occurences of pattern matches", function () {
    //   var firstUrl = "http://localhost:8080",
    //       secondUrl = "www.google.com",
    //       content = "load(" + firstUrl + ");\n" +
    //                 "http.get( '" + secondUrl + "' )",
    //       result = remoteload.extractUrls(content, [
    //         /
    //
    //   expect(remoteload.extractUrls("load('http://localhost:8080');\nhttp.get('www.google.com')"
    // });
  });
});
