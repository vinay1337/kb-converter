const { ipcRenderer } = require('electron');
const { shell } = require('electron').remote;

const path = "\\\\fs-hsg-1\\IT Department\\KB PDF2HTML\\";


document.getElementById('organize').addEventListener('click', () => {
    document.getElementById('formatter').style.display = 'none';
    ipcRenderer.send('organize');
});

ipcRenderer.on('organize-done', (event,args)=>{
    ipcRenderer.send('beautipy');
});

ipcRenderer.on('beautipy-done', (events,args) => {
    //Done!
});