const path = require('path');
const { app } = require('electron');
module.exports = {
    // Global variables
    
    // App
    mainWindow: null,
    tray: null,    
    // Profiles
    profiles: [],
    profilesPath: path.join(app.getPath('userData'), 'profiles.json'),

}