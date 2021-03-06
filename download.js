// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const {
    ipcRenderer
} = require('electron');
const {
    remote,
    shell
} = require('electron').remote;
//const dialog = remote.dialog;

let KBcount = -1;
let downloaded = -1;
let DLstatus;
let DLcount;

// --Add load events here-- //
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
// Focuses textarea on load
addLoadEvent(() => {
    document.getElementById('DLbox').focus();
});

//reset variables;
function reset() {
    KBcount = -1;
    downloaded = -1;
    //document.getElementById("DLbox").value = '';
}


// download button listener
document.getElementById('download').addEventListener('click', function () {

    //reset(); //ipcRenderer.send('download-reset', 0);

    let LIST = document.getElementById("DLbox").value;
    document.getElementById('download').style.display = 'none';
    DLstatus = document.getElementById('DLstatus');
    DLcount = document.getElementById('DLcount');
    DLstatus.style.display = 'block';
    DLcount.style.display = 'block';

    console.log('sending list');
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
    if (args == 1337) {
        DLcount.innerHTML = 'Nothing to Download';
    } else {
        DLcount.style.display = 'none';
    }
    //document.getElementById('download').style.display = 'inline-block';
    reset();
});


//------------------------THIRD COLUMN----------------------------//

// //open names.txt
// document.getElementById('names').addEventListener('click', function () {
//     ipcRenderer.send('names.txt', 0);
// });
// //open KB conversion log.xlsx
// document.getElementById('conversion-log').addEventListener('click', function () {
//     ipcRenderer.send('conversion-log', 0);
// });
// //open KB conversion log.xlsx
// document.getElementById('acrobat').addEventListener('click', function () {
//     ipcRenderer.send('acrobat', 0);
// });