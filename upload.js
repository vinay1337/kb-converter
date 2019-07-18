const{ shell } = require('electron').remote;

const path = "\\\\fs-hsg-1\\IT Department\\KB PDF2HTML\\";

// open conversion log spreadsheet
document.getElementById('outputDir').addEventListener('click', function () {
    shell.openItem(path + 'Organized');
});