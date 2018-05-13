// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const WebSocket = require('ws');
var { dialog } = require('electron').remote;
var fs = require('fs');
var wss;
function getSelectCard() {
    var selectedIdCard = null;
    var cboxes = document.getElementsByName('chkIdCard');
    for (var i = 0; i < cboxes.length; i++) {
        if (cboxes[i].checked) {
            selectedIdCard = cboxes[i].value
        }
    }
    return selectedIdCard;
}
function loadCardFromStorage() {
    const mocks = JSON.parse(localStorage.getItem('mocks'));
    const ul = document.getElementById('mockList');
    ul.innerHTML = '';
    mocks.forEach(mock => {
        var li = document.createElement('li');
        var label = document.createElement('label');
        label.className = 'radio';
        label.innerHTML = `
            <input type="radio" name="chkIdCard" id="chkIdCard" value="${
            mock['Data']['NationalID']
            }">
            ${mock['Data']['NationalID']} ${mock['Data']['ThaiFirstName']}
        `;
        li.appendChild(label);
        ul.appendChild(li);
    });
}

function removeCardFromStorage() {
    const selectedIdCard = getSelectCard();
    if (!selectedIdCard) {
        alert('Please select id card!!!');
        return;
    }
    let mocks = JSON.parse(localStorage.getItem('mocks'));
    if (!mocks) {
        localStorage.setItem('mocks', JSON.stringify([]));
        mocks = JSON.parse(localStorage.getItem('mocks'));
    }
    mocks = mocks.filter(mock => mock['Data']['NationalID'] !== selectedIdCard);
    localStorage.setItem('mocks', JSON.stringify(mocks));
    loadCardFromStorage();
}

function saveCardFromStorage(data) {
    let mocks = JSON.parse(localStorage.getItem('mocks'));
    if (!mocks) {
        localStorage.setItem('mocks', JSON.stringify([]));
        mocks = JSON.parse(localStorage.getItem('mocks'));
    }
    mocks = mocks.filter(
        mock => mock['Data']['NationalID'] !== data['Data']['NationalID']
    );
    mocks = mocks.concat(data);
    localStorage.setItem('mocks', JSON.stringify(mocks));
}

function onLoadFile() {
    dialog.showOpenDialog(
        {
            filters: [{ name: 'Custom File Type', extensions: ['json'] }]
        },
        fileNames => {
            if (fileNames === undefined) {
                console.log('No file selected');
                return;
            }

            fs.readFile(fileNames[0], 'utf-8', (err, data) => {
                if (err) {
                    alert('An error ocurred reading the file :' + err.message);
                    return;
                }
                const obj = JSON.parse(data);
                console.log('The file content is : ', obj);
                saveCardFromStorage(obj);
                loadCardFromStorage();
            });
        }
    );
}

function startWebSocket() {
    wss = new WebSocket.Server({ port: 8088, path: '/ReadIDCard' });
    console.log('startWebSocket');

    wss.on('connection', function connection(ws) {
        ws.on('message', function incoming(message) {
            console.log('received: %s', message);
        });
        ws.on('close', function close() {
            console.log('disconnected');
        });
    });
    document.querySelector('#btnOnCardInserted').removeAttribute('disabled');
    document.querySelector('#btnOnCardLoadProgress').removeAttribute('disabled');
    document.querySelector('#btnOnCardLoadCompleted').removeAttribute('disabled');
    document.querySelector('#btnOnCardRemoved').removeAttribute('disabled');
    document.querySelector('#btnOnCardLoadError').removeAttribute('disabled');
    document.querySelector('#btnStopWebSocket').removeAttribute('disabled');
    document.querySelector('#btnStartWebSocket').setAttribute('disabled', false);
}

function stopWebSocket() {
    console.log('stopWebSocket');
    wss.close();
    document.querySelector('#btnStartWebSocket').removeAttribute('disabled');
    document.querySelector('#btnStopWebSocket').setAttribute('disabled', false);
    document.querySelector('#btnOnCardInserted').setAttribute('disabled', false);
    document
        .querySelector('#btnOnCardLoadProgress')
        .setAttribute('disabled', false);
    document
        .querySelector('#btnOnCardLoadCompleted')
        .setAttribute('disabled', false);
    document.querySelector('#btnOnCardRemoved').setAttribute('disabled', false);
    document.querySelector('#btnOnCardLoadError').setAttribute('disabled', false);
    document.querySelector('#btnStopWebSocket').setAttribute('disabled', false);
}

function onCardInserted() {
    console.log('onCardInserted');
    wss.clients.forEach(function (client) {
        client.send(JSON.stringify({ Event: 'OnCardInserted' }));
    });
}

function onCardLoadProgress() {
    console.log('onCardLoadProgress');
    var selectedIdCard = getSelectCard();
    if (!selectedIdCard) {
        alert('Please select id card!!!');
        return;
    }
    document
        .querySelector('#btnOnCardLoadProgress')
        .setAttribute('disabled', false);
    for (let i = 0; i <= 10; i++) {
        setTimeout(() => {
            wss.clients.forEach(function (client) {
                client.send(
                    JSON.stringify({
                        Event: 'OnCardLoadProgress',
                        Progress: i * 10
                    })
                );
            });
        }, i * 100);
    }
    const idCardList = JSON.parse(localStorage.getItem('mocks'));
    if (idCardList && idCardList.length > 0) {
        const mockIdCardInfo = idCardList.filter(idCard => idCard['Data']['NationalID'] === selectedIdCard)[0];
        setTimeout(() => {
            wss.clients.forEach(function (client) {
                client.send(
                    JSON.stringify({
                        Event: 'OnCardLoadCompleted',
                        PhotoImage: mockIdCardInfo.PhotoImage,
                        Data: btoa(JSON.stringify(mockIdCardInfo.Data))
                    })
                );
            });
            document
                .querySelector('#btnOnCardLoadProgress')
                .removeAttribute('disabled');
        }, 1100);
    }
}

function atob(a) {
    return new Buffer(a, 'base64').toString('binary');
}

function btoa(b) {
    return new Buffer(b).toString('base64');
}

function onCardLoadCompleted() {
    console.log('onCardLoadCompleted');
    const selectedIdCard = getSelectCard();
    if (!selectedIdCard) {
        alert('Please select id card!!!');
        return;
    }
    const idCardList = JSON.parse(localStorage.getItem('mocks'));
    if (idCardList && idCardList.length > 0) {
        const mockIdCardInfo = idCardList.filter(idCard => idCard['Data']['NationalID'] === selectedIdCard)[0];
        wss.clients.forEach(function (client) {
            client.send(
                JSON.stringify({
                    Event: 'OnCardLoadCompleted',
                    PhotoImage: mockIdCardInfo.PhotoImage,
                    Data: btoa(JSON.stringify(mockIdCardInfo.Data))
                })
            );
        });
    }
}

function onCardRemoved() {
    console.log('onCardRemoved');
    wss.clients.forEach(function (client) {
        client.send(JSON.stringify({ Event: 'OnCardRemoved' }));
    });
}

function onCardLoadError() {
    console.log('onCardLoadError');
    wss.clients.forEach(function (client) {
        client.send(JSON.stringify({ Event: 'OnCardLoadError', Error: '-9802' }));
    });
}
function initail() {
    document
        .querySelector('#btnStartWebSocket')
        .addEventListener('click', startWebSocket);
    document
        .querySelector('#btnStopWebSocket')
        .addEventListener('click', stopWebSocket);
    document
        .querySelector('#btnOnCardInserted')
        .addEventListener('click', onCardInserted);
    document
        .querySelector('#btnOnCardLoadProgress')
        .addEventListener('click', onCardLoadProgress);
    document
        .querySelector('#btnOnCardLoadCompleted')
        .addEventListener('click', onCardLoadCompleted);
    document
        .querySelector('#btnOnCardRemoved')
        .addEventListener('click', onCardRemoved);
    document
        .querySelector('#btnOnCardLoadError')
        .addEventListener('click', onCardLoadError);
    document.querySelector('#btnLoadFile').addEventListener('click', onLoadFile);
    document
        .querySelector('#btnDeleteCard')
        .addEventListener('click', removeCardFromStorage);
}

initail();
loadCardFromStorage();
