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
//let fetchWindow         // hidden, injects scripts, download KBs
let contents // reference to mainWindow.webContents
let authed = false; // false until authed through Shibboleth
//let KBID = -1;          // current KB being processed
let KBlist = -1; // List of all KBs to download
let KBcount = -1; // current index in KBlist of KB being processed
let returnCount = 0; // counts how many fetchWindows have sent a pdf-message back
let toDownload = 0; //number of KB PDFs to download
let downloadCount = 0; // counts how many KB PDF's have been downloaded
let legend; // array to map KBID's to filenames. gets written to legend.csv

let flow = new events.EventEmitter(); // event emitter to structure program
let doneLocate = false; // true once all fetchWindows have sent pdf-messages back



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
    //Show loading gif
    //mainWindow.loadFile('loader.html');
    //Open new window for searching for pdf's
    let index = 0; //for ordering purposes
    for (let KBID of KBlist) {
        locatePDF(KBID, index);
        index++;
    }
});

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
            ipcRenderer.send('pdf-message', [${KBID},"NULL",${index}]);
            }
        `);
    });
}

// triggered when a fetchWindow searches for a PDF and either finds one or doesn't
ipcMain.on('pdf-message', (event, arg) => {
    // arg[0] is KBID
    // arg[1] is file url
    // arg[2] is index

    //console.log('From ' + arg[0] + ' found ' + arg[1] + ' at position ' + arg[2]); // debug
    returnCount++;
    console.log(`>${arg[0]}\treceived: ${returnCount}/${KBcount}`);

    if (arg[1] == 'NULL') {
        console.log(`>${arg[0]}\tPDF not found. Skipping.`);
    } else if (!(arg[1].endsWith('.pdf'))) {
        console.log(`>${arg[0]}\tWrong file type received: ${arg[1]} Skipping.`);
        arg[1] = 'NULL';
    } else {
        console.log(`>${arg[0]}\tPDF located!`);
    }

    var regex = /[^\/]+$/; // pattern to be matched
    filename = arg[1].match(regex); // matches the filename at the end of the url only
    legend[arg[2]] = [arg[0], filename[0]]; // add to legend

    //close window associated with message
    BrowserWindow.fromWebContents(event.sender.webContents).close();

    // once all fetchWindows have sent messages to main process, end locating stage
    if ((returnCount >= KBcount) && !doneLocate) {
        doneLocate = true;
        console.log("done locating KBs");

        flow.emit('done-locating'); // start writing legend stage
    }
});

flow.on('done-locating', function () {
    console.log("\n~~~Writing Legend Files~~~");
    legend.forEach(function (KB) {
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

    let downloadList;

    legend.forEach(function(KB){
        if (KB[1] != 'NULL') {
            toDownload++;
            downloadList.push(KB);
        }
    });

    downloadList.forEach(function (KB) {
        if (KB[1] != 'NULL') {
            let from = onlinePath + KB[0] + '/' + KB[1];
            let to = downloadPath + KB[1];
            console.log(`>${KB[0]}\tDownloading ${KB[1]}`);
            console.log(`  FROM:\t${from}`)
            console.log(`    TO:\t${to}`);
            
            downloadFile(from, to, KB[0]);
        }
    });
});

function downloadFile(file_url, targetPath, msg) {

    var req = request({
        method: 'GET',
        uri: file_url
    });

    var out = fs.createWriteStream(targetPath);
    req.pipe(out);

    req.on('end', function () {
        console.log(`>${msg}\tPDF download complete`);
        downloadCount++;

        if(downloadCount >= toDownload){
            console.log('done downloading files');
            flow.emit('done-downloading');
        }
    });
}

flow.on('done-downloading', function(){
    mainWindow.close();
    console.log('\n\n~~~DONE~~~')
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