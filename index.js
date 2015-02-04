console.log("plugin recognized");
var remoteloadUI = require("./ui.js");
// var createRemoteLoader = function (loggerFactory, conf) {
//   var logger = loggerFactory.create("preprocessor:remoteload");
//   var keys = function (obj) {
//     for(var key in obj) {
//       console.log(key);
//     }
//   };
//   keys("factory", loggerFactory);
//   keys("logger", logger);
//   console.log("rainbow", logger.rainbow);
//   console.log("trace", logger.trace.toString());
//
//   return function (content, file, done) {
//     console.log(file);
//     done(content.replace("doof", "intelligent"));
//   };
// };
// createRemoteLoader.$inject = ['logger', 'config.remoteloadPreprocessor'];
//
remoteloadUI.createRemoteLoader.$inject = ['config.remoteloadPreprocessor'];

module.exports = {
  'preprocessor:remoteload': [ 'factory', remoteloadUI.createRemoteLoader]
};
