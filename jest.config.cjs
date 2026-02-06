module.exports = {
  testEnvironment: "node",
  moduleFileExtensions: ["js", "json"],
  testMatch: ["**/*.test.js"],
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  globals: {
    describe: "readonly",
    it: "readonly",
    expect: "readonly",
    beforeEach: "readonly",
    jest: "readonly",
  },
};
