// THIS APP USES YARN, NOT NPM, PLEASE DO NOT DIRTY THE PACKAGE.JSON WITH NPM PACKAGES

/** HOSTSMANAGER TLO
 * 
 * 1. Create a GUI that allows users to add/remove profiles
 * 2. Create a tray icon that allows users to quickly switch profiles
 * 
 * Start To End || STE
 * 
 * 1. Create a tray icon that allows users to quickly switch profiles, toggle profiles, and stop the app
 * 2. Create a GUI that allows users to add/remove profiles
 * 3. Manage the hosts file based on the profiles selected, and allow users to toggle profiles
 * 4. Track profiles through a JSON configuration file
 * 
 * TO DO || TODO
 * 
 * 1. Prevent user from needing to enter password every time on linux/mac
 */


// Environment Variables & Setup  
const { app, BrowserWindow, Menu, Tray, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const {...Global} = require('./js/globals.js');
const sudo = require("sudo-prompt");
const sudoOptions = {
  name: 'HostsManager',
  icns: path.join(__dirname, 'assets', 'tray-icon.png'),
};

// Startup App Management
app.on('ready', async () => {
  let profiles = Global.profiles = profileDbInit(); // Sets the profiles variable to the contents of the profiles.json file
  createTray(profiles);
});

// Tray Management
const createTray = (profiles) => {
  tray = new Tray(path.join(__dirname, 'assets', 'tray-icon.png'));
  tray.setToolTip('Hosts Manager');
  updateTrayMenu(profiles);
}
const updateTrayMenu = async (profiles = Global.profiles) => {
  const menu = Menu.buildFromTemplate([
    { label: 'Open GUI', click: () => createWindow() },
    { type: 'separator' },
    { label: 'Profiles', submenu: profiles.map(profile => { return { label: profile.nickname, type:'checkbox', checked:profile.active, click: () => UpdateHostsFile(profile.fqdn, profile.ip) } }) },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}

// Profile Management Setup (Synchonous)
const profileDbInit = () => {
  let profiles = [];
  if (!fs.existsSync(Global.profilesPath)) {
    fs.writeFileSync(Global.profilesPath, JSON.stringify(profiles));
  }
  try {
    profiles = JSON.parse(fs.readFileSync(Global.profilesPath));
    console.log("Profiles Loaded");
    console.log(Global.profilesPath);
  } catch {
    throwError("Error reading profiles.json, please delete the file and restart the app", Global.profilesPath);
  }
  if(profiles.length == 0){
    profiles.push({nickname: "Default", fqdn: "localhost", ip: "127.0.0.1"});
  }

  // Read the hosts file and set active to true if the fqdn is found
  // Change the hosts path based on OS
  let os = process.platform;
  let hostsPath = "";
  if (os == 'win32') {
    hostsPath = path.join('C:\\Windows\\System32\\drivers\\etc\\hosts');
  }
  else if (os == 'darwin') {
    hostsPath = path.join('/etc/hosts');
  }
  else if (os == 'linux') {
    hostsPath = path.join('/etc/hosts');
  }
  else {
    throwError("Unsupported OS", os);
  }
  let hosts = fs.readFileSync(hostsPath, 'utf8');
  let hostsArray = hosts.split('\n');
  // Itterate through the hosts file, and set active to true if the fqdn is found
  for (let i = 0; i < hostsArray.length; i++) {
    for (let j = 0; j < profiles.length; j++) {
      const regex = new RegExp(profiles[j].ip + '\\s+' + profiles[j].fqdn, 'i');
      if (hostsArray[i].includes(profiles[j].fqdn)) {
        // Check if it matches a regex for a valid hosts file entry
        if (regex.test(hostsArray[i])) {
          // Check if the line is commented out
          if (hostsArray[i].charAt(0) == "#") {
            profiles[j].active = false;
          }
          else {
            profiles[j].active = true;
          }
        }
      }
    }
  }
  console.log(profiles);
  return profiles;
}

// Hosts Management
function UpdateHostsFile(fqdn, ip, remove = false) {
  let profile = Global.profiles.find(profile => profile.fqdn == fqdn);
  profile.deleted = false;
  let os = process.platform;
  console.log("Toggling " + fqdn + " " + ip + " on " + os);

  // Set hosts path based on OS
  let hostsPath = "";
  if (os == 'win32') {
    hostsPath = path.join('C:\\Windows\\System32\\drivers\\etc\\hosts');
  }
  else if (os == 'darwin' || os == 'linux') {
    hostsPath = path.join('/etc/hosts');
  }
  else {
    throwError("Unsupported OS", os);
  }
  let hosts = fs.readFileSync(hostsPath, 'utf8');
  let hostsArray = hosts.split('\n');
  // go through line by line and see if the fqdn is already there
  let fqdnFound = false;
  const regex = new RegExp(ip + '\\s+' + fqdn, 'i');
  for (let i = 0; i < hostsArray.length; i++) {
    if (hostsArray[i].includes(fqdn)) {
      // Check if it matches a regex for a valid hosts file entry
      if (regex.test(hostsArray[i])) {
        fqdnFound = true;
        if(remove){
          // Delete the line
          hostsArray[i] = '';
          profile.deleted = true;
        }
        // Check if the line is commented out
        else if (hostsArray[i].charAt(0) == "#") {
          // If the line is commented out, remove the comment
          hostsArray[i] = hostsArray[i].replaceAll('#', '');
          profile.active = true;
        }
        else {
          // If the line is not commented out, comment it out
          hostsArray[i] = '#' + hostsArray[i];
          profile.active = false;
        }
      }
    }
  }
  // If the fqdn was not found, add it to the end of the file
  if (!fqdnFound) {
    hostsArray.push(ip + '\t' + fqdn);
    profile.active = true;
  }

  // Clean up empty lines
  hostsArray = hostsArray.filter(function (el) {
    return el != "";
  });

  // Add empty line at the end of the file for catting
  hostsArray.push("");

  // save or delete the profile
  if(profile.deleted){
    Global.profiles = Global.profiles.filter(profile => profile.fqdn != fqdn);
    console.log("Deleting profile " + fqdn);
  } else {
    console.log(Global.profiles);
    Global.profiles.find(profile => profile.fqdn == fqdn).ip = ip;
    Global.profiles.find(profile => profile.fqdn == fqdn).active = profile.active;
    console.log("Saving profile " + fqdn);
  }

  // Write the hosts file
  if(os == 'win32'){
    fs.writeFileSync(hostsPath, hostsArray.join('\n'));
    saveProfiles();
    refreshApp();
  } else {
    // Linux and Mac
    fs.writeFileSync("/tmp/hoststmp", hostsArray.join('\n'));
    sudo.exec("mv /tmp/hoststmp /etc/hosts", sudoOptions, function (error, stdout, stderr) {
      if (error) {
        throwError("Error updating hosts file", error);
      }
      saveProfiles();
      refreshApp();
    });
  }
}


// Window Management
function createWindow() {
  Global.mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  Global.mainWindow.loadFile(path.join(__dirname, 'frontend', 'index.html'));

  Global.mainWindow.on('closed', () => {
    Global.mainWindow = null;
  });
}
// Profile/Hosts Management
async function sendProfiles() {
  Global.mainWindow.webContents.send('getProfiles', Global.profiles);
}
async function saveProfiles() {
  return new Promise((resolve, reject) => {
    let {profiles, profilesPath} = Global;
    // Save the profiles to the profiles.json file
    fs.writeFileSync(profilesPath, JSON.stringify(profiles));
    // Verify the profiles were saved to the profiles.json file correctly
    try {
      let newProfiles = JSON.parse(fs.readFileSync(profilesPath));
      if (newProfiles.length != profiles.length) {
        reject("Error Saving Profiles");
      } else {
        resolve();
      }
    }
    catch {
      reject("Error Saving Profiles");
    }
  });
}
async function refreshApp() {
  if(Global.mainWindow !== null) sendProfiles();
  updateTrayMenu();
}
// // Error Handling
const throwError = (message, loc, die = true) => {
  // Create error window
  let errorWindow = new BrowserWindow({
    width: 400,
    height: 200,
    resizable: false,
    webPreferences: {
      nodeIntegration: true
    }
  });
  message = message + "\n\n" + loc;
  // Load error.html
  errorWindow.loadFile(path.join(__dirname, "frontend" ,'error.html'));

  // Send error message to error.html
  errorWindow.webContents.on('did-finish-load', () => {
    errorWindow.webContents.send('error-message', message);
  });

  // Quit app when error window is closed
  errorWindow.on('closed', () => {
    if (die) {
      app.quit();
    }
  });
}
// // IPC Communication
ipcMain.on('addProfile', (event, profileData) => {
  const { fqdn, ip, nickname } = profileData;
  // Save the profile to the profile array and the profiles.json file
  Global.profiles.push({ fqdn, ip, nickname });
  saveProfiles().then(() => {
    console.log('Profile saved to the database.');
    refreshApp();
  }).catch((err) => {
    console.error(err);
    throwError("Something Went Wrong while Saving Profiles", profilesPath, false);
  });
});

ipcMain.on('removeProfile', (event, profileData) => {
  // Remove the profile from the profile array and the profiles.json file
  UpdateHostsFile(profileData.fqdn, profileData.ip, true)
});

ipcMain.on('updateProfile', (event, profileData) => {
  const { fqdn, ip, nickname } = profileData;
  let found = false;
  // Update the profile in the profile array and the profiles.json file
  Global.profiles = Global.profiles.map((profile) => {
    if (profile.fqdn == fqdn) {
      found = true;
      profile.ip = ip;
      profile.nickname = nickname;
    }
    return profile;
  });
  if (!found) {
    Global.profiles.push({ fqdn, ip, nickname });
  }
  saveProfiles().then(() => {
    console.log('Profile saved to the database.');
    refreshApp();
  }).catch((err) => {
    console.error(err);
    throwError("Something Went Wrong while Saving Profiles", profilesPath, false);
  }); 
});

ipcMain.on('getProfiles', async (event) => {
  event.reply('getProfiles', Global.profiles);
});

// App Prevent AutoClose
app.on('window-all-closed', () => {
  // Hide the dock icon but keep the app running
  if (process.platform == 'darwin') {
    app.dock.hide();
  }
})