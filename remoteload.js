function Pattern (regex, groupIndex) {
  if (!(regex instanceof RegExp)) {
    throw new Error("Pattern awaits a regular Expression as first Parameter");
  }

  var braketMatch = regex.toString().match(/(\()/g);
  //Assure that the groupIndex has a corresponding group in the regex
  if (typeof groupIndex !== "number" || (groupIndex > 0 && !braketMatch[groupIndex -1])) {
    throw Error ("The groupIndex " + groupIndex + " does not fit a group in your Regex");
  }
  this.regex = regex;
  this.groupIndex = groupIndex;
}

module.exports = {

  Pattern: Pattern,

  extractUrls: function(content, patterns) {
    if (typeof content !== "string") {
      throw new Error("extractUrls expects a string as content");
    }

    if (!(patterns instanceof Array)) {
      throw new Error("extractUrls expects an Array of patterns");
    }

    var matches = patterns.forEach(function(pattern) {
      if (!(pattern instanceof Pattern)) {
        throw new Error("extractUrls allows only Patterns as input");
      }
    });
  }
};
