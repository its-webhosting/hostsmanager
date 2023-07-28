module.exports = {
  packagerConfig: {
    asar: true,
    appBundleId: 'com.cmkrist.hostsmanager',
    appCategoryType: 'public.app-category.developer-tools',

  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        iconUrl: 'https://raw.githubusercontent.com/cmkrist/hostsmanager/master/src/assets/icon-256.ico',
        setupIcon: 'src/assets/icon-256.ico'
      },
    },
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: {
        format: 'ULFO',
        overwrite: true,
        icon: 'src/assets/icon-512.icns'
      },
    },
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: {
        options: {
          maintainer: 'Cody Krist',
          categories: ['Development'],
          genericName: 'Hosts Manager',
          productName: "Hosts Manager",
          icon: 'src/assets/icon-512.png'
        },
      },
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'cmkrist',
          name: 'hostsmanager',
        },
        prerelease: true,
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
};
