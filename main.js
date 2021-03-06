const {
    app,
    BrowserWindow,
    shell,
    ipcMain,
    dialog
} = require('electron');
const fs = require('fs-extra');
const events = require('events');
const request = require('request');
const spawn = require('child_process').spawn;

// PATH
const path = "\\\\fs-hsg-1\\IT Department\\KB PDF2HTML\\";
const downloadPath = path + "PDFs\\";
const pyPath = path + 'Scripts\\HTML-beauti.py\\HTML-Beauti.py';
const onlinePath = "http://kb.wisc.edu/images/group87/";

let mainWindow;
let authed = false; // false until authed through Shibboleth

//Downloader variables
let KBlist = -1; // List of all KBs to download
let legend; // array to map KBID's to filenames. gets written to legend.csv
let returnCount = 0; // counts how many fetchWindows have sent a pdf-message back
let toDownload = 0; // number of KB PDFs to download
let downloadCount = 0; // counts how many KB PDF's have been downloaded

let flow = new events.EventEmitter(); // event emitter to structure program

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            nodeIntegration: true
        },
        backgroundColor: '#343434',
        autoHideMenuBar: true,
        titleBarStyle: "hiddenInset"
    })

    mainWindow.maximize();

    // and load the KB to get login page
    mainWindow.loadFile('./prereqs.html');

    // Emitted when the window is closed.
    mainWindow.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    });
}


//=============================Downloader=============================//
{
    function initialize() {
        console.log('initializing...');
        fs.writeFileSync(path + 'Data\\names.txt', '');
        console.log('names.txt cleared');
        KBlist = -1; // List of all KBs to download
        legend = []; // array to map KBID's to filenames. gets written to legend.csv
        returnCount = 0; // counts how many fetchWindows have sent a pdf-message back
        toDownload = 0; // number of KB PDFs to download
        downloadCount = 0; // counts how many KB PDF's have been downloaded
        console.log('initialization complete!');
    }


    // Triggered when "Start Download" button pressed in UI
    ipcMain.on('LIST', (event, arg) => {
        console.log('\n~~~Received KB ID List~~~');

        //clear names file, initialize variables
        initialize();

        // delimits by spaces, commas, and newlines. Automatically filters out blank spaces
        KBlist = arg.split(/[ ,\n]+/).filter(Boolean);

        //make user log in to UW site
        checkAuth();
    });

    // if not authed, prompt for auth
    // not cleared on initialize
    function checkAuth() {
        if (!authed) {
            let authWindow = new BrowserWindow({
                width: 800,
                height: 600,
                webPreferences: {
                    nodeIntegration: true
                },
                autoHideMenuBar: true,
                titleBarStyle: "hiddenInset"
            });

            authWindow.loadURL('http://kb.wisc.edu/housing/internal/');
            console.log("\nLog in with NetID to access KB");

            // Check if kb page loaded after login
            authWindow.webContents.on('page-title-updated', function () {
                if (authed == false && (authWindow.getURL() == "https://kb.wisc.edu/housing/internal/")) {
                    console.log("KB access authorized");
                    authed = true;
                    authWindow.close();
                    flow.emit('authed');
                }
            });
        } else {
            flow.emit('authed');
        }
    }

    // once authed, start searching for KBs based on list
    flow.on('authed', () => {
        console.log('\n\n~~~Parsing KB ID List~~~');

        // array to map numbers to pdf names;
        legend = Array(KBlist.length);
        legend.fill(-1);

        console.log(KBlist);
        console.log(KBlist.length + ' total\n');

        console.log("\n~~~Locating KBs Asynchronously~~~");

        //update main window to show progress
        if (KBlist.length == 0) {
            shell.beep();
            console.log('nothing to download');
            mainWindow.webContents.send('DONE', 1337);
            flow.emit('done-downloading');
            return;
        }
        mainWindow.webContents.send('locating', KBlist.length);

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
            webPreferences: {
                nodeIntegration: true
            },
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
        // [0] is KBID
        // [1] is file url
        // [2] is index

        //close window associated with message
        BrowserWindow.fromWebContents(event.sender.webContents).close();

        returnCount++; // how many fetchWindows have returned a message (all of them should)
        console.log(`>${arg[0]}\treceived: ${returnCount}/${KBlist.length}`);
        mainWindow.webContents.send('locating', returnCount); //Send status to renderer

        // Check url returned and see if object contains a pdf or if it even exists
        if (arg[1] == 'NONE') {
            console.log(`>${arg[0]}\tPDF not found. Skipping.`);
        } else if (!(arg[1].endsWith('.pdf'))) {
            console.log(`>${arg[0]}\tWrong file type received: ${arg[1]} Skipping.`);
            arg[1] = 'NONE';
        } else {
            // toDownload++;
            console.log(`>${arg[0]}\tPDF located!`);
        }

        filename = arg[1].match(/[^\/]+$/); // matches everything after the last forward slash to the end of the string
        legend[arg[2]] = [arg[0], filename[0]]; // add to legend

        // once all fetchWindows have sent messages to main process, end locating stage
        if ((returnCount >= KBlist.length)) {
            console.log("done locating KBs");
            //flow.emit('done-locating'); // start writing legend stage
            console.log("\n~~~Verifying~~~");

            let downloadList = []; // list of KBs to download

            let index = 0;
            legend.forEach((KB) => {
                index++;
                mainWindow.webContents.send('verifying', index);
                //fs.appendFileSync(path + 'Data\\legend.csv', KB[0] + "," + KB[1] + "\n");
                fs.appendFileSync(path + 'Data\\names.txt', KB[1] + "\n");
                console.log(`>${KB[0]}\tnames.txt appended: ${KB[1]}`);

                if (KB[1] != 'NONE') {
                    toDownload++;
                    downloadList.push(KB);
                }
            });

            legend = downloadList;

            console.log("done verifying");
            flow.emit('done-verify'); // start downloading stage
        }
    });

    // download KBs
    flow.on('done-verify', function () {
        // [0] is KBID
        // [1] is file url
        // [2] is index

        console.log("\n~~~Downloading PDF Files Asynchronously~~~");
        console.log('download path: ' + downloadPath + '\n');

        mainWindow.webContents.send('downloading', toDownload);

        // if there's nothing to download, end downloading stage
        if (toDownload == 0) {
            shell.beep();
            console.log('nothing to download');
            mainWindow.webContents.send('DONE', 1337);
            flow.emit('done-downloading');
        }

        // download all pdfs which exist
        legend.forEach(function (KB) {
            if (KB[1] != 'NONE') {
                let from = onlinePath + KB[0] + '/' + KB[1];
                let to = downloadPath + KB[0] + '.pdf'; //names pdf after KB ID
                console.log(`>${KB[0]}\tDownloading ${KB[1]}`);
                console.log(`  FROM:\t${from}`)
                console.log(`    TO:\t${to}`);

                downloadFile(from, to, KB[0]);
            } else {
                console.log('ERROR this should never happen');
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

    // end state of downloader
    flow.on('done-downloading', function () {
        console.log('\n~~~DONE~~~\n');
        shell.beep(); // beep beep
    });
}

//=============================Organizer=============================//
{
    let names; // KBID list for organizer

    ipcMain.on('organize', (event, args) => {
        let HTMlcount = 0;
        let cc = 0; // copy count
        names = [];

        function ccc() { // copy count callback
            cc--;
            if (cc <= 0) {
                console.log('Done organizing HTMLs');
                console.log('KBs copied: ' + names);
                event.reply('organize-done', names, HTMlcount);
            }
        }

        //Organize HTMLs TODO:
        fs.readdirSync(path + 'HTMLs').forEach(item => {

            let srcPath = path + 'HTMLs\\';
            let KBID = item.match(/(.+?)(\.[^.]*$|$)/)[1]; //ex. item ='30749.html' => [0]='30749.html' [1]='30749', [2]='.html

            let destPath = path + 'Organized\\' + KBID + '\\';
            fs.mkdirpSync(destPath);

            if (fs.lstatSync(srcPath + item).isDirectory()) { //copy images

                fs.mkdirpSync(destPath + 'Images\\');

                fs.readdirSync(srcPath + item).forEach(file => { //images folder loop
                    let to = destPath + 'Images\\' + file;
                    let from = srcPath + item + '\\' + file;

                    console.log(from + ' >>>>> ' + to);
                    cc++;
                    fs.copy(from, to, err => {
                        if (err) return console.error(err);
                        console.log(KBID, file + ' copied sucessfully!');
                        ccc();
                    });
                });
            } else if (fs.lstatSync(srcPath + item).isFile()) { //copy html file
                let to = destPath + item;
                let from = srcPath + item;

                console.log(from + ' >>>>> ' + to);
                HTMlcount++;
                cc++;
                fs.copy(from, to, err => {
                    if (err) return console.error(err);
                    console.log(item + ' copied sucessfully!');
                    ccc();
                });

                names.push(KBID);
            }
        });


        //Organize PDFs
        fs.readdirSync(path + "PDFs").forEach(file => {
            let KBID = file.match(/(.+?)(\.[^.]*$|$)/)[1]; //ex. file ='30749.pdf' => [0]='30749.pdf' [1]='30749', [2]='.pdf'
            let src = path + 'PDFs\\' + file;
            let dir = path + 'Organized\\' + KBID;
            let dest = dir + '\\' + file;
            fs.mkdirpSync(dir); //create dest dir if doesn't exits

            console.log(src + ' >>>>> ' + dest);
            cc++;
            fs.copy(src, dest, err => { //copy PDFs
                if (err) return console.error(err);
                console.log(file + ' copied sucessfully!');
                ccc();
            });
        });
    });

    ipcMain.on('beautipy', (event, args) => {
        let pyargs = [pyPath];
        let count = 0;
        args.forEach(function (id) {
            pyargs.push(id.toString());
            console.log(id);
        });

        console.log('Running HTML-beauti.py...');
        python = spawn('python', pyargs);

        python.stdout.on('data', (data) => {
            console.log(`${data}`);
            count++;
            event.reply('pycount', count);
        });

        python.on('exit', (code) => {
            console.log('HTML-beauti.py completed');
            console.log('exiting...');
            event.reply('beautipy-done');
        });
    });
}

ipcMain.on('notfoundhtml', (event, args) => {
    if (args == '') {
        dialog.showErrorBox(
            'Please enter a KB ID',
            `KB ID cannot be empty`
        );
    } else {
        dialog.showErrorBox(
            'File Not Found',
            `${args}.html not found in "${path + 'Organized\\' + args}"`
        );
    }
});

ipcMain.on('notfoundimg', (event, args) => {
    if (args == '') {
        dialog.showErrorBox(
            'Please enter a KB ID',
            `KB ID cannot be empty`
        );
    } else {
        dialog.showErrorBox(
            'Image Folder Not Found',
            `"${path + 'Organized\\' + args + '\\Images'}" not found`
        );
    }
});

ipcMain.on('adminempty',  (event,args)=>{
    dialog.showErrorBox(
        'Please enter a KB ID',
        `KB ID cannot be empty`
    );
});

//=============================Electron App=============================//
{
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
    });
}