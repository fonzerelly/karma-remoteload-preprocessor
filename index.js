console.log("plugin recognized");
var preLoad = function (loggerFactory) {
  var logger = loggerFactory.create("preprocessor:preload");

  return function (content, file, done) {
    console.log(file);
    done(content.replace("doof", "intelligent"));
  };
};
preLoad.$inject = ['logger'];

module.exports = {
  'preprocessor:preload': [ 'factory', preLoad ]
};
