const{ shell } = require('electron').remote;

const path = "\\\\fs-hsg-1\\IT Department\\KB PDF2HTML\\";

// open python 3 download website
document.getElementById('py-download').addEventListener('click', function () {
    shell.openExternal('https://www.python.org/downloads/')
});
// import batch converter macro to Adobe Acrobat
document.getElementById('macro').addEventListener('click', function () {
    shell.openItem(path + 'Scripts\\Batch convert to HTML.sequ');
});
// open conversion log spreadsheet
document.getElementById('conversion-log').addEventListener('click', function () {
    shell.openItem(path + 'KB conversion log.xlsx');
});
