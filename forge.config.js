module.exports = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {
    icon: "./TBP"
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        authors: "TheDevYellowy",
        setupIcon: "./TBP.ico",
        name: "TBP-Installer"
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
};
