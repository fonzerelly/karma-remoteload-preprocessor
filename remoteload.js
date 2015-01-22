var //dependencies
request = require("request"),
async = require("async"),
temp = require("temp"),
fs = require("fs");

var //Pattern definition
Pattern = function (regex, groupIndex, substitute) {
  if (!(regex instanceof RegExp)) {
    throw new Error("Pattern awaits a regular Expression as first Parameter");
  }

  //Assure that the groupIndex has a corresponding group in the regex
  var braketMatch = regex.toString().match(/([^\\]\()/g);
  if (typeof groupIndex !== "number" || (groupIndex > 0 && !braketMatch[groupIndex -1])) {
    throw new Error ("The groupIndex " + groupIndex + " does not fit a group in your Regex");
  }

  if(typeof substitute !== "string" || substitute.indexOf(this.__GET_MARKER__()) < 0) {
    throw new Error ("The substitude \"" + substitute + "\" does not contain the marker \""+ this.__GET_MARKER__() +"\"");
  }
  this.regex = regex;
  this.groupIndex = groupIndex;
  this.substitute = substitute;
};

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

Pattern.prototype.__GET_MARKER__ = function () {
  return "%RESOURCE%";
};

var //extractPatternGroup
extractPatternGroup = function(content, patterns) {
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
};

var //createCountProxy
createCountProxy = function (count, callback) {
  if (typeof count !== "number") {
    throw new TypeError("createCountProxy awaits a Number as first argument");
  }
  if (!(callback instanceof Function)) {
    throw new TypeError("createCountProxy awaits a Callback function as second argument");
  }
   var currentCount = 0;
   return function () {
     currentCount += 1;

     var args = Array.prototype.slice.call(arguments);
     if (currentCount >= count) {
       return callback.apply(null, args);
     }
   };
};

var //loadUrls
_requestUrl = function (url, targetDir, finishRequest) {
  var
  countedFinishRequest = createCountProxy(2, finishRequest),
  suffix = ".unknown",
  tempFile = temp.createWriteStream({
    dir   : targetDir,
    prefix: "remoteload_"
  }).on("close", function (err) {
    countedFinishRequest(null, this.path, suffix);
  });

  request.get(url)
    .on("response", function(response) {
      var
      mimetype = response.headers["content-type"],
      suffixIndex = mimetype.indexOf("/") + 1;
      suffix = "." + mimetype.slice(suffixIndex);

      countedFinishRequest(null, tempFile.path, suffix);
    }).pipe(tempFile);
},

_appendSuffix = function(path, suffix, finishSuffix) {
   var pathWithSuffix = path + suffix;
   fs.rename(path, pathWithSuffix, function () {
     finishSuffix(null, pathWithSuffix);
   });
},

_applyResult = function(finish_, urlTemporaries_, url_, err, temporary) {
  urlTemporaries_[url_] = temporary;
  finish_();
},

loadUrls = function(urls, targetDir, finishLoadUrls) {
  if (!(urls instanceof Array)) {
    throw new Error("loadUrls awaits an Array of strings");
  }
  urls.forEach(function (url) {
    if (typeof url !== "string") {
      throw new Error("loadUrls awaits an Array of strings");
    }
  });
  if (!fs.existsSync(targetDir)) {
    throw new TypeError("loadurls awaits an existing target directory");
  }
  if (!(finishLoadUrls instanceof Function)) {
    throw new Error("loadUrls provides its results to the finishLoadUrls function you missed");
  }
  urlTemporaries = {};
  async.forEach(urls, function(url, finishUrl) {
    async.waterfall([
      async.apply(_requestUrl, url, targetDir),
      _appendSuffix
    ], async.apply(_applyResult, finishUrl, urlTemporaries, url));
  },function () {
    finishLoadUrls(null, urlTemporaries);
  });
};

var modifyContent = function(content) {
  if (typeof content !== "string") {
    throw new Error("modifyContennt expects a string as content");
  }
};

module.exports = {

  Pattern             : Pattern,
  extractPatternGroup : extractPatternGroup,
  createCountProxy    : createCountProxy,
  loadUrls            : loadUrls,
  modifyContent       : modifyContent


};

