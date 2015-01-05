//var request = require("request");

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

  loadUrls: function(urls) {
    if (!(urls instanceof Array)) {
      throw new Error("loadUrls awaits an Array of strings");
    }
    urls.reduce(function (init, url) {
      if (typeof url !== "string") {
        throw new Error("loadUrls awaits an Array of strings");
      }
      //request(url);

    }, {});
  }

};
