const { app, BrowserWindow, Menu, Tray, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { profile } = require('console');


// Environment Variables & Setup  
let mainWindow, tray;
let profiles = new Array();

// Use JSON file to store profiles in user's appdata folder
const userDataPath = app.getPath('userData');
const profilesPath = path.join(userDataPath, 'profiles.json');

// Create profiles.json if it doesn't exist
if (!fs.existsSync(profilesPath)) {
  fs.writeFileSync(profilesPath, JSON.stringify(profiles));
}

// Read profiles.json and store in profiles array
try {
  profiles = JSON.parse(fs.readFileSync(profilesPath));
} catch {
  throwError("Error reading profiles.json, please delete the file and restart the app", profilesPath);
}
// Window Management
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'frontend', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}
// Tray Management
const createTray = () => {
  tray = new Tray(path.join(__dirname, 'assets', 'tray-icon.png'));
  tray.setToolTip('Etc Manager');
  updateTrayMenu();
}
const updateTrayMenu = async () => {
  let profiles = await getProfiles();
  const menu = Menu.buildFromTemplate([
    { label: 'Open GUI', click: () => createWindow() },
    { type: 'separator' },
    { label: 'Profiles', submenu: profiles.map(profile => { return { label: profile.nickname, click: () => UpdateHostsFile(profile.fqdn, profile.ip) } }) },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}
// Profile/Hosts Management
async function getProfiles() {
  return profiles;
}
async function sendProfiles() {
  let profiles = await getProfiles();
  mainWindow.webContents.send('getProfiles', profiles);
}
async function saveProfiles() {
  return new Promise((resolve, reject) => {
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
function UpdateHostsFile(fqdn, ip, remove = false) {
  console.log(remove ? "Removing" : "Adding" + " " + fqdn + " " + ip);
  const fs = require('fs');
  // Set Hosts based on OS
  const hostsPath = (process.platform == 'win32' ? 'C:\\Windows\\System32\\drivers\\etc\\hosts' : '/etc/hosts');
  // Read the hosts file
  fs.readFile(hostsPath, 'utf8', function (err, data) {
    if (err)
      return console.log(err);
    // Split the hosts file into an array of lines
    let lines = data.split('\n');
    // Find the line with the fqdn
    let lineIndex = lines.findIndex((line) => line.includes(fqdn));
    // If the line exists
    if (lineIndex > -1) {
      // Put a # in front of the line if we are removing it
      if (remove) {
        lines[lineIndex] = '#' + lines[lineIndex];
      } else {
        // Remove the # from the line if it exists
        lines[lineIndex] = lines[lineIndex].replace('#', '');
      }
    } else {
      // If we are not removing the line
      if (!remove) {
        // Add the line
        lines.push(ip + ' ' + fqdn);
      }
    }
    // Write the hosts file
    fs.writeFile(hostsPath, lines.join('\n'), function (err) {
      if (err) return console.log(err);
      console.log("Hosts file updated.")
      console.log(lines.join('\n'));
    });
  });
}
async function refreshApp() {
  sendProfiles();
  updateTrayMenu();
}
// Error Handling
const throwError = (message, path, die = true) => {
  // Create error window
  let errorWindow = new BrowserWindow({
    width: 400,
    height: 200,
    resizable: false,
    webPreferences: {
      nodeIntegration: true
    }
  });
  message = message + "\n\n" + path;
  // Load error.html
  errorWindow.loadFile(path.join(__dirname, 'error.html'));

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
// IPC Communication
ipcMain.on('addProfile', (event, profileData) => {
  const { fqdn, ip, nickname } = profileData;
  // Save the profile to the profile array and the profiles.json file
  profiles.push({ fqdn, ip, nickname });
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
  profiles = profiles.filter((profile) => profile.fqdn != profileData.fqdn);
  saveProfiles().then(() => {
    console.log('Profile Removed from the database.');
    refreshApp();
  }).catch((err) => {
    console.error(err);
    throwError("Something Went Wrong while Saving Profiles", profilesPath, false);
  });
}
);

ipcMain.on('updateProfile', (event, profileData) => {
  const { fqdn, ip, nickname } = profileData;
  let found = false;
  // Update the profile in the profile array and the profiles.json file
  profiles = profiles.map((profile) => {
    if (profile.fqdn == fqdn) {
      found = true;
      profile.ip = ip;
      profile.nickname = nickname;
    }
    return profile;
  });
  if (!found) {
    profiles.push({ fqdn, ip, nickname });
  }
  saveProfiles().then(() => {
    console.log('Profile saved to the database.');
    refreshApp();
  }
  ).catch((err) => {
    console.error(err);
    throwError("Something Went Wrong while Saving Profiles", profilesPath, false);
  }
  ); 
  
}
);

ipcMain.on('getProfiles', async (event) => {
  sendProfiles();
}
);
// Initialization & Event Handling
app.on('ready', async () => {
  profiles = await getProfiles();
  createTray();
});
app.on('window-all-closed', () => {
  // Hide the dock icon but keep the app running
  if (process.platform == 'darwin') {
    app.dock.hide();
  }
})