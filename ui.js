var remoteload = require("./remoteload"),
    fs = require("fs-extra");
var createRemoteLoader = function (config) {
  var patterns = config.patterns.map(function (patternDescriptor) {
    return new remoteload.Pattern(
      patternDescriptor.regex,
      patternDescriptor.groupIndex,
      patternDescriptor.substitute
    );
  });

  fs.ensureDirSync(config.dir);

  return function (content, file, done) {
    var urls = remoteload.extractPatternGroup(content, patterns);
    if (urls.length === 0) {
      done(content);
    }
    remoteload.loadUrls(urls, config.dir, function(error, urlsTemporaries){
      var newContent = remoteload.modifyContent(
        content,
        patterns,
        urlTemporaries
      );
      done(newContent);
    });
  };
};
module.exports = {
  createRemoteLoader: createRemoteLoader,

};
