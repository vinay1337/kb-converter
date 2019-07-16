const {
    ipcRenderer
} = require('electron');
const {
    shell
} = require('electron').remote;

const path = "\\\\fs-hsg-1\\IT Department\\KB PDF2HTML\\";

let numHTMLs;
let status;
let progress;
let gif;


document.getElementById('organize').addEventListener('click', () => {
    status = document.getElementById('status');
    progress = document.getElementById('progress');
    gif = document.getElementById('gif');

    document.getElementById('organize').style.display = 'none';

    status.style.display = 'block';
    progress.style.display = 'block';
    gif.style.display = 'block';
    status.innerHTML = `Organizing...`;
    ipcRenderer.send('organize');
});

ipcRenderer.on('organize-done', (event, pyargs, HTMLcount) => {
    numHTMLs = HTMLcount;

    status.style.display = 'block';
    status.innerHTML = `Cleaning...`;

    progress.style.display = 'block';
    progress.innerHTML = `(0/${numHTMLs})`;

    ipcRenderer.send('beautipy', pyargs);
});

ipcRenderer.on('pycount', (event, args) => {

    status.innerHTML = `Cleaning...`
    progress.innerHTML = `(${args}/${numHTMLs})`;
});

ipcRenderer.on('beautipy-done', (events, args) => {
    progress.style.display = 'none';
    gif.style.display = 'none';
    status.style.display = 'block';
    status.innerHTML = 'KBs Formatted Successfully!'
    //Done!
});