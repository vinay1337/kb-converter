// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const {
    ipcRenderer
} = require('electron')

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



document.getElementById('submit').addEventListener('click', function () {

    let LIST = document.getElementById("box").value;

    // send username to main.js 
    ipcRenderer.send('LIST', LIST);
    //str.split(/[ ,]+/).filter(Boolean); //https://stackoverflow.com/questions/10346722/how-can-i-split-a-javascript-string-by-white-space-or-comma
});