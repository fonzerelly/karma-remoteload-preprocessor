console.log("plugin recognized");
var createRemoteLoader = function (loggerFactory, conf) {
  console.log(conf);
  //var logger = loggerFactory.create("preprocessor:remoteload");

  return function (content, file, done) {
    console.log(file);
    done(content.replace("doof", "intelligent"));
  };
};
createRemoteLoader.$inject = ['logger', 'config.remoteloadPreprocessor'];

module.exports = {
  'preprocessor:remoteload': [ 'factory', createRemoteLoader]
};
