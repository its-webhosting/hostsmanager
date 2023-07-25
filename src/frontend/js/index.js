const { ipcRenderer } = require('electron');

const page = 'profiles';
let firstTime = true;

// Add Profile Form
const form = document.getElementById('profileForm');
form.addEventListener('submit', (event) => {
    event.preventDefault();
    const fqdn = document.getElementById('fqdn').value;
    const ip = document.getElementById('ip').value;
    const nickname = document.getElementById('nickname').value || fqdn;
    const update = document.getElementById('updateExisting').checked;
    if (update) {
        const response = confirm(`Are you sure you want to update ${nickname} (${fqdn})?`);
        if (response) {
            ipcRenderer.send('updateProfile', { fqdn, ip, nickname });
        }
        else {
            return;
        }
    } else {
        ipcRenderer.send('addProfile', { fqdn, ip, nickname });
    }
    form.reset();
    pageChange('profiles');
});

// Get Profiles from main process
ipcRenderer.on('getProfiles', (event, profiles) => {
    if(firstTime) {
        firstTime = false;
    } else {
        window.location.reload();
    }
    console.log(profiles);
    // Keep only the first row of the ProfileTable
    const table = document.getElementById('ProfileTable');
    const firstRow = table.rows[0];
    table.innerHTML = '';
    table.appendChild(firstRow);
    // Add each profile to the table
    profiles.forEach(profile => {
        const row = table.insertRow();
        const fqdn = row.insertCell();
        const ip = row.insertCell();
        const nickname = row.insertCell();
        fqdn.innerHTML = profile.fqdn;
        ip.innerHTML = profile.ip;
        nickname.innerHTML = profile.nickname;
    });
    // Remove existing Event Listeners
    const newTable = table.cloneNode(true);
    table.parentNode.replaceChild(newTable, table);
    // On right click prompt for deletion
    newTable.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const fqdn = event.target.parentNode.cells[0].innerHTML;
        const nickname = event.target.parentNode.cells[2].innerHTML;
        const ip = event.target.parentNode.cells[1].innerHTML;
        const response = confirm(`Are you sure you want to delete ${nickname} (${fqdn})?`);
        if (response) {
            ipcRenderer.send('removeProfile', {fqdn, nickname, ip});
        }
    });
    // On left click open add profile page and fill out with existing profile
    newTable.addEventListener('click', (event) => {
        const fqdn = event.target.parentNode.cells[0].innerHTML;
        const ip = event.target.parentNode.cells[1].innerHTML;
        const nickname = event.target.parentNode.cells[2].innerHTML;
        document.getElementById('fqdn').value = fqdn;
        document.getElementById('ip').value = ip;
        document.getElementById('nickname').value = nickname;
        pageChange('add', true);
    });

});

function pageChange(page) {
    // Hide all pages
    const pages = document.getElementsByClassName('page');
    const tabs = document.querySelectorAll('#NavBar li');
    for (let i = 0; i < pages.length; i++) {
        pages[i].style.display = 'none';
    }
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }
    switch (page) {
        case 'add':
            // Add page
            document.getElementById('addProfile').style.display = 'block';
            document.getElementById('addProfileTab').classList.add('active');
            break;
        default:
            // Profiles page
            document.getElementById('profiles').style.display = 'block';
            document.getElementById('profilesTab').classList.add('active');
            break;
    }
}

// Start Page
const doneLoading = () => {
    ipcRenderer.send('getProfiles');
    pageChange(page);
};

document.readyState === 'complete' ? doneLoading() : window.addEventListener('load', doneLoading);