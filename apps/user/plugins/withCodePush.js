const { withStringsXml, withInfoPlist } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to inject CodePushDeploymentKey into Android strings.xml and iOS Info.plist.
 * Prevents build failure where PackageList.java looks for R.string.CodePushDeploymentKey.
 */
function withCodePush(config, props = {}) {
  const androidKey = props.androidKey || process.env.CODEPUSH_ANDROID_KEY || 'PLACEHOLDER_ANDROID_KEY';
  const iosKey = props.iosKey || process.env.CODEPUSH_IOS_KEY || 'PLACEHOLDER_IOS_KEY';

  // Inject into Android strings.xml
  config = withStringsXml(config, (config) => {
    config.modResults = setStringItem(config.modResults, 'CodePushDeploymentKey', androidKey);
    return config;
  });

  // Inject into iOS Info.plist
  config = withInfoPlist(config, (config) => {
    config.modResults.CodePushDeploymentKey = iosKey;
    return config;
  });

  return config;
}

function setStringItem(stringsXml, name, value) {
  if (!stringsXml.resources) {
    stringsXml.resources = {};
  }
  if (!stringsXml.resources.string) {
    stringsXml.resources.string = [];
  }
  const existing = stringsXml.resources.string.find((s) => s && s.$ && s.$.name === name);
  if (existing) {
    existing._ = value;
  } else {
    stringsXml.resources.string.push({ $: { name, translatable: 'false' }, _: value });
  }
  return stringsXml;
}

module.exports = withCodePush;
