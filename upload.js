const{ shell } = require('electron').remote;

const path = "\\\\fs-hsg-1\\IT Department\\KB PDF2HTML\\";

// open conversion log spreadsheet
document.getElementById('outputDir').addEventListener('click', function () {
    shell.openItem(path + 'Organized');
});


document.getElementById('adminView').addEventListener('click', () => {
    let KBID = document.getElementById('KBIDtxt').value;
    shell.openExternal('https://kb.wisc.edu/kbAdmin/document.php?id=' + KBID);
});

document.getElementById("KBIDtxt").addEventListener("keyup", function (event) {
    event.preventDefault();
    if (event.keyCode === 13) {
        document.getElementById("adminView").click();
    }
});