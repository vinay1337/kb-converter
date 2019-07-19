const {
    shell
} = require('electron').remote;
const {
    clipboard,
    ipcRenderer
} = require('electron');
const exec = require('child_process').exec;
const fs = require('fs');

const path = "\\\\fs-hsg-1\\IT Department\\KB PDF2HTML\\";

// open conversion log spreadsheet
document.getElementById('outputDir').addEventListener('click', function () {
    shell.openItem(path + 'Organized');
});

document.getElementById('adminView').addEventListener('click', () => {
    let KBID = document.getElementById('KBIDtxt').value;

    if (KBID == '') {
        ipcRenderer.send('adminempty');
    } else {
        shell.openExternal('https://kb.wisc.edu/kbAdmin/document.php?id=' + KBID);
    }
});

document.getElementById('HTMLedit').addEventListener('click', () => {
    let KBID = document.getElementById('KBIDtxt').value;
    let editor = document.getElementById('editor').checked; //checked == vscode
    let HTMLpath = path + `Organized\\${KBID}\\${KBID}.html`;
    if (fs.existsSync(HTMLpath)) {
        if (editor) {
            exec('code "' + HTMLpath + '"', () => {});
        } else {
            exec('notepad "' + HTMLpath + '"', () => {});
        }
    } else {
        ipcRenderer.send('notfoundhtml', KBID);
    }
});

document.getElementById('copyPath').addEventListener('click', () => {
    //Copy path to clipboard
    let KBID = document.getElementById('KBIDtxt').value;
    let testpath = path + `Organized\\${KBID}\\Images`;
    if (fs.existsSync(testpath)) {
        clipboard.clear();
        clipboard.writeText('\\\\fs-hsg-1\\IT Department\\KB PDF2HTML\\Organized\\' + KBID + '\\Images');

        //Display confirmation and change button color
        document.getElementById('copyPath').value = 'Copied!';
        document.getElementById('copyPath').style.backgroundColor = '#343434';
    } else {
        ipcRenderer.send('notfoundimg', KBID);
    }
});

//Reset copy images path button when KBID is modified
document.getElementById('KBIDtxt').oninput = () => {
    document.getElementById('copyPath').value = 'Copy image path';
    document.getElementById('copyPath').style.backgroundColor = '#24b0a2';
};

//Enter key support for text box
document.getElementById("KBIDtxt").addEventListener("keyup", function (event) {
    event.preventDefault();
    if (event.keyCode === 13) {
        document.getElementById("adminView").click();
    }
});