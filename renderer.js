// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const {
    ipcRenderer
} = require('electron')

let KBcount = -1;
let downloaded = -1;
let DLstatus;
let DLcount;

// --Load events below-- //
function addLoadEvent(func) {
    var oldonload = window.onload;
    if (typeof window.onload != 'function') {
        window.onload = func;
    } else {
        window.onload = function () {
            if (oldonload) {
                oldonload();
            }
            func();
        }
    }
}

function autofocusBox() {
    document.getElementById('box').focus();
}

addLoadEvent(autofocusBox);

// --Load events above-- //

document.getElementById('download').addEventListener('click', function () {

    let LIST = document.getElementById("box").value;
    document.getElementById('download').style.display = 'none';
    DLstatus = document.getElementById('DLstatus');
    DLcount = document.getElementById('DLcount');

    DLstatus.style.display = 'block';
    DLcount.style.display = 'block';

    // send username to main.js 
    ipcRenderer.send('LIST', LIST);
});

// Show user that KBs are being located and show progress
ipcRenderer.on('locating', (event, args) => {
    if (KBcount < 0) {
        DLstatus.innerHTML = 'Locating...'
        KBcount = args;
        DLcount.innerHTML = `(0/${KBcount})`;
    } else {
        DLcount.innerHTML = `(${args}/${KBcount})`;
    }
});

// Show user that KBs are being verified (writing legend file) and show progress
ipcRenderer.on('verifying', (event, args) => {
    DLstatus.innerHTML = 'Verifying...';
    DLcount.innerHTML = `(${args}/${KBcount})`;
});

// Show user that KBs are being downloaded and show progress
ipcRenderer.on('downloading', (event, args) => {
    if (downloaded == -1) {
        DLstatus.innerHTML = 'Downloading...';
        downloaded = args;
        DLcount.innerHTML = `(0/${downloaded})`;
    } else {
        DLcount.innerHTML = `(${args}/${downloaded})`;
    }
});

// Display names button and display done!
ipcRenderer.on('DONE', (event, args) => {
    DLstatus.innerHTML = 'Done!';
    if (args == 1337){
        DLcount.innerHTML = 'nothing to download';
    } else {
        DLcount.style.display = 'none';
    }
    //TODO: download again button
});

document.getElementById('names').addEventListener('click', function () {
    ipcRenderer.send('names.txt',0);
});