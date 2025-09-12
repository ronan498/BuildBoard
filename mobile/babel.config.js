module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      ["module-resolver", {
        root: ["."],
        alias: { "@": "./", "@app": "./app", "@src": "./src" },
        extensions: [".ts", ".tsx", ".js", ".json"]
      }],
      "react-native-worklets/plugin", // <- must be last for Reanimated v4
    ],
  };
};