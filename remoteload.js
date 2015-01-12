var request = require("request");
var async = require("async");
var temp = require("temp");

function Pattern (regex, groupIndex) {
  if (!(regex instanceof RegExp)) {
    throw new Error("Pattern awaits a regular Expression as first Parameter");
  }

  //Assure that the groupIndex has a corresponding group in the regex
  var braketMatch = regex.toString().match(/([^\\]\()/g);
  if (typeof groupIndex !== "number" || (groupIndex > 0 && !braketMatch[groupIndex -1])) {
    throw Error ("The groupIndex " + groupIndex + " does not fit a group in your Regex");
  }
  this.regex = regex;
  this.groupIndex = groupIndex;
}

Pattern.prototype.execStatefully = function (content) {
  if (content === undefined) {
    if (this.regex.global) {
      return this.regex.exec(this._content);
    } else {
      return null;
    }
  }
  this._content = content;
  return this.regex.exec(content);
};


module.exports = {

  Pattern: Pattern,

  extractPatternGroup: function(content, patterns) {
    if (typeof content !== "string") {
      throw new Error("extractUrls expects a string as content");
    }

    if (!(patterns instanceof Array)) {
      throw new Error("extractUrls expects an Array of patterns");
    }

    var matches = patterns.reduce(function(init, pattern) {
      if (!(pattern instanceof Pattern)) {
        throw new Error("extractUrls allows only Patterns as input");
      }
      var match = pattern.execStatefully(content);
      while (match !== null) {
        init.push(match[pattern.groupIndex]);
        match = pattern.execStatefully();
      }
      return init;

    }, []);

    return matches;
  },

  loadUrls: function(urls, finishLoadUrls) {
    if (!(urls instanceof Array)) {
      throw new Error("loadUrls awaits an Array of strings");
    }
    urls.forEach(function (url) {
      if (typeof url !== "string") {
        throw new Error("loadUrls awaits an Array of strings");
      }
    });
    if (!(finishLoadUrls instanceof Function)) {
      throw new Error("loadUrls provides its results to the finishLoadUrls function you missed");
    }
    var urlTemporaries = {};
    async.forEach(urls, function(url, finishUrl) {
      var
      tempFile = null,
      suffix = "unknown",
      urlRequest = null;

      async.series([
        function requestUrl (finishRequestUrl) {
          urlRequest = request
            .get(url)
            .on("response", function (response) {
               var
               mimetype = response.headers["content-type"],
               slashIndex = mimetype.indexOf("/");

               if(slashIndex < 0) {
                 throw new Error("Invalid Mimetype format: \"" + mimetype + "\"");
               }
               suffix  = "." + mimetype.slice(slashIndex + 1);
               finishRequestUrl();
            });
        },
        function storeTemp(finishStoreTemp) {
           tempFile = temp.createWriteStream({
            prefix: "remoteload_",
            suffix: suffix
          });

          urlTemporaries[url] = tempFile.path;
          finishStoreTemp();
        }
      ], finishUrl);
    }, function (err) {
      if (err) throw err;
      finishLoadUrls(null, urlTemporaries);
    });

  }

};
