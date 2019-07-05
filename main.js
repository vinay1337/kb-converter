const {
    app,
    BrowserWindow,
    shell,
    ipcMain
} = require('electron');
const fs = require('fs');
const events = require('events');
const request = require('request');

const path = "\\\\fs-hsg-1\\IT Department\\KB PDF2HTML\\";
const downloadPath = path + "PDFs\\";
const onlinePath = "http://kb.wisc.edu/images/group87/";

let mainWindow // login, UI to enter KBIDs, loading gif
let authed = false; // false until authed through Shibboleth
let KBlist = -1; // List of all KBs to download
let KBcount = -1; // number of KBs in list to be processed
let returnCount = 0; // counts how many fetchWindows have sent a pdf-message back
let toDownload = 0; //number of KB PDFs to download
let downloadCount = 0; // counts how many KB PDF's have been downloaded
let legend; // array to map KBID's to filenames. gets written to legend.csv

let flow = new events.EventEmitter(); // event emitter to structure program

// creates main window after app launch
function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1125,
        height: 750,
        webPreferences: {
            nodeIntegration: true
        },
        autoHideMenuBar: true,
        titleBarStyle: "hiddenInset"
    })

    mainWindow.maximize();

    // and load the KB to get login page
    mainWindow.loadURL('http://kb.wisc.edu/housing/internal/');
    console.log("\n\n");
    console.log("Log in with NetID to access KB");

    // Easy access to webContents
    contents = mainWindow.webContents;

    // Emitted when the window is closed.
    mainWindow.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    });

    // Check if kb page loaded after login
    mainWindow.webContents.on('page-title-updated', function () {
        if (authed == false && (mainWindow.getURL() == "https://kb.wisc.edu/housing/internal/")) {
            console.log("KB access authorized");
            authed = true;

            mainWindow.webContents.loadFile('index.html');
        }
    });
}

// Called when "Start Download" button pressed in UI
ipcMain.on('LIST', (event, arg) => {
    KBlist = arg.split(/[ ,\n]+/).filter(Boolean); // delimits by spaces, commas, and newlines. Automatically filters out blank spaces
    KBcount = KBlist.length;
    legend = Array(KBcount);
    legend.fill(-1);

    console.log("\n~~~List of KBs Recieved~~~")
    console.log(KBlist);
    console.log(KBcount + ' total\n');

    //clear legend file
    fs.writeFileSync(path + 'Data\\legend.csv', '');
    console.log('legend.csv cleared');
    //clear names file
    fs.writeFileSync(path + 'Data\\names.txt', '');
    console.log('names.txt cleared');

    console.log("\n~~~Locating KBs Asynchronously~~~")
    //update main window to show progress
    if(KBcount == 0){
        shell.beep();
        console.log('nothing to download');
        mainWindow.webContents.send('DONE', 1337);
        flow.emit('done-downloading');
        return;
    }
    mainWindow.webContents.send('locating', KBcount);

    //Open new window for searching for pdf's
    let index = 0; //for ordering purposes
    for (let KBID of KBlist) {
        if (isNaN(KBID)) {
            //if KBID is not a number, replace KBID and load dummy page instead
            console.log(`${KBID} is invalid format`);
            KBlist[index] = 0;
            locatePDF(0, index);
        } else {
            locatePDF(KBID, index);
        }
        index++;
    }
});

//opens a fetchWindow for each KBID, then injects javascript code
//injected code tries to locate PDF object then sends message back to main process
function locatePDF(KBID, index) {
    let fetchWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        },
        autoHideMenuBar: true,
        titleBarStyle: "hiddenInset",
        show: false
    });

    //load the page corresponding to the KBID
    fetchWindow.loadURL('https://kb.wisc.edu/housing/internal/' + KBID);

    // returns a message whether or not it finds a pdf object in the DOM
    fetchWindow.webContents.once('dom-ready', function () {
        //console.log('locating pdf for KB ' + KBID);
        console.log(`>${KBID}\tlocating PDF...'`);
        fetchWindow.webContents.executeJavaScript(`
            console.log('injecting script');
            const { ipcRenderer } = require('electron');

            if (document.getElementsByTagName('OBJECT').length > 0){
            console.log('embeded object exists');
            var path = document.getElementsByTagName('OBJECT')[0].data;
            console.log(path);
            ipcRenderer.send('pdf-message', [${KBID},path,${index}]);
            } else {
            console.log('pdf not found!');
            ipcRenderer.send('pdf-message', [${KBID},'NONE',${index}]);
            }
        `);
    });
}

// triggered when a fetchWindow searches for a PDF and either finds one or doesn't
ipcMain.on('pdf-message', (event, arg) => {
    // arg[0] is KBID
    // arg[1] is file url
    // arg[2] is index

    returnCount++; // how many fetchWindows have returned a message (all of them should)
    console.log(`>${arg[0]}\treceived: ${returnCount}/${KBcount}`);
    mainWindow.webContents.send('locating', returnCount); //Send status to renderer

    // Check url returned and see if object contains a pdf or if it even exists
    if (arg[1] == 'NONE') {
        console.log(`>${arg[0]}\tPDF not found. Skipping.`);
    } else if (!(arg[1].endsWith('.pdf'))) {
        console.log(`>${arg[0]}\tWrong file type received: ${arg[1]} Skipping.`);
        arg[1] = 'NONE';
    } else {
        console.log(`>${arg[0]}\tPDF located!`);
    }

    var regex = /[^\/]+$/; // pattern to be matched
    filename = arg[1].match(regex); // matches the filename at the end of the url only
    legend[arg[2]] = [arg[0], filename[0]]; // add to legend

    //close window associated with message
    BrowserWindow.fromWebContents(event.sender.webContents).close();

    // once all fetchWindows have sent messages to main process, end locating stage
    if ((returnCount >= KBcount)) {
        console.log("done locating KBs");
        flow.emit('done-locating'); // start writing legend stage
    }
});

// called when locating stage is complete
flow.on('done-locating', function () {
    console.log("\n~~~Writing Legend Files~~~");
    let i = 0;
    legend.forEach(function (KB) {
        i++;
        mainWindow.webContents.send('verifying', i);
        fs.appendFileSync(path + 'Data\\legend.csv', KB[0] + "," + KB[1] + "\n");
        fs.appendFileSync(path + 'Data\\names.txt', KB[1] + "\n");
        console.log(`>${KB[0]}\t${KB[1]}`);
    });

    console.log("done writing legend files");
    flow.emit('done-writing'); // start downloading stage
});

flow.on('done-writing', function () {
    console.log("\n~~~Downloading PDF Files Asynchronously~~~");
    console.log('download path: ' + downloadPath + '\n');

    let downloadList = [];

    legend.forEach(function (KB) {
        if (KB[1] != 'NONE') {
            toDownload++;
            downloadList.push(KB);
        }
    });

    mainWindow.webContents.send('downloading', toDownload);

    // if there's nothing to download, end downloading stage
    if (toDownload == 0) {
        shell.beep();
        console.log('nothing to download');
        mainWindow.webContents.send('DONE', 1337);
        flow.emit('done-downloading');
    }

    // download all pdfs which exist
    downloadList.forEach(function (KB) {
        if (KB[1] != 'NONE') {
            let from = onlinePath + KB[0] + '/' + KB[1];
            let to = downloadPath + KB[0] + '.pdf';   // use this line if using NEW kb-organizer
            //let to = downloadPath + KB[1];          // use this line if using OLD kb-organizer
            console.log(`>${KB[0]}\tDownloading ${KB[1]}`);
            console.log(`  FROM:\t${from}`)
            console.log(`    TO:\t${to}`);

            downloadFile(from, to, KB[0]);
        }
    });
});

// writes download information to a file
function downloadFile(file_url, targetPath, msg) {
    var req = request({
        method: 'GET',
        uri: file_url
    });

    // pipe data from request to a file
    var out = fs.createWriteStream(targetPath);
    req.pipe(out);

    // triggers when download completes
    req.on('end', function () {
        console.log(`>${msg}\tPDF download complete`);
        downloadCount++;

        mainWindow.webContents.send('downloading', downloadCount); //update progress in renderer

        if (downloadCount >= toDownload) {
            console.log('done downloading files');
            mainWindow.webContents.send('DONE', 0);
            flow.emit('done-downloading');
        }
    });
}

flow.on('done-downloading', function () {
    console.log('\n~~~DONE~~~\n');
    shell.beep(); // beep beep
});

ipcMain.on('names.txt', (event, args) => {
    shell.openItem(path + 'Data\\names.txt');
});

ipcMain.on('download-reset', (events, args) => {
    KBlist = -1; // List of all KBs to download
    KBcount = -1; // number of KBs in list to be processed
    returnCount = 0; // counts how many fetchWindows have sent a pdf-message back
    toDownload = 0; //number of KB PDFs to download
    downloadCount = 0; // counts how many KB PDF's have been downloaded
    legend; // array to map KBID's to filenames. gets written to legend.csv
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) createWindow()
})