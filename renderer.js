// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const {
    ipcRenderer
} = require('electron')

let KBcount = -1;
let DLcount = -1;
let msg;
let count;

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

document.getElementById('submit').addEventListener('click', function () {

    let LIST = document.getElementById("box").value;
    document.getElementById('submit').style.display = 'none';
    msg = document.getElementById('msg');
    count = document.getElementById('count');

    msg.style.display = 'block';
    count.style.display = 'block';

    // send username to main.js 
    ipcRenderer.send('LIST', LIST);
});

// Show user that KBs are being located and show progress
ipcRenderer.on('locating', (event, args) => {
    if (KBcount < 0) {
        msg.innerHTML = 'Locating...'
        KBcount = args;
        count.innerHTML = `(0/${KBcount})`;
    } else {
        count.innerHTML = `(${args}/${KBcount})`;
    }
});

// Show user that KBs are being verified (writing legend file) and show progress
ipcRenderer.on('verifying', (event, args) => {
    msg.innerHTML = 'Verifying...';
    count.innerHTML = `(${args}/${KBcount})`;
});

// Show user that KBs are being downloaded and show progress
ipcRenderer.on('downloading', (event, args) => {
    if (DLcount == -1) {
        msg.innerHTML = 'Downloading...';
        DLcount = args;
        count.innerHTML = `(0/${DLcount})`;
    } else {
        count.innerHTML = `(${args}/${DLcount})`;
    }
});

// Display close button
ipcRenderer.on('DONE', (event, args) => {
    msg.innerHTML = 'Done!';
    if (args == 1337){
        count.innerHTML = 'nothing to download';
    } else {
        count.style.display = 'none';
    }
    document.getElementById('close').style.display = 'block';
});

document.getElementById('close').addEventListener('click', function () {
    ipcRenderer.send('CLOSE',0);
});