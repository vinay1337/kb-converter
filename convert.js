const {
    shell
} = require('electron').remote;

const path = "\\\\fs-hsg-1\\IT Department\\KB PDF2HTML\\";

//open names.txt
document.getElementById('names').addEventListener('click', function () {
    shell.openItem(path + 'Data/names.txt');
});
//open KB conversion log.xlsx
document.getElementById('conversion-log').addEventListener('click', function () {
    shell.openItem(path + 'KB conversion log.xlsx');
});
//open KB conversion log.xlsx
document.getElementById('acrobat').addEventListener('click', function () {
    shell.openItem('C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Adobe Acrobat DC');
});