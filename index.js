if (require('electron-squirrel-startup')) return;

const { app, BrowserWindow, Tray, Menu, Notification } = require('electron');
const { keyboard } = require('@nut-tree/nut-js');
const { EventSub } = require('twitch-utils');
const config = require('./config.json');
const Backend = require('./backend');
const fs = require('fs');

const resourcePath = process.resourcesPath;

/** @type {?EventSub} */
var eventsub;

/** @type {?userData} */
var userData;

/** @type {?BrowserWindow} */
var win;

/** @type {?Backend} */
var backend;

async function createStartWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 800,
    title: "TBP",
    autoHideMenuBar: true,
    icon: `${__dirname}/TBP.ico`
  });

  win.on('minimize', (ev) => {
    ev.preventDefault();
    win.hide();
    new Notification({
      title: "TBP",
      icon: `${__dirname}/TBP.ico`,
      body: "TBP is hidden, you can re-open or close it from the task bar"
    }).show();
  });

  if(!fs.existsSync(`${resourcePath}/userData.json`)) {
    backend = new Backend(null);
    win.loadURL('http://localhost:6060/getInfo');
  } else {
    userData = require(`${resourcePath}/userData.json`);
    eventsub = new EventSub(config['client-id'], config['client-secret'], { api: { 
      client_token: userData.token,
      refresh_token: userData.refresh,
      customTokens: false
    }});

    backend = new Backend(eventsub.api);
    await start();
  }

  backend.on('start', () => {
    userData = require(`${resourcePath}/userData.json`)
    eventsub = new EventSub(config['client-id'], config['client-secret'], { api: {
      client_token: userData.token,
      refresh_token: userData.refresh,
      customTokens: false
    }});

    start();
  });
};

async function start() {
  win.loadURL('http://localhost:6060/config');
  win.setSize(500, 800);

  eventsub.connect({ type: "websocket" });

  eventsub.once('online', async () => {
    const res = await eventsub.subscribe('channel.channel_points_custom_reward_redemption.add', 1, { broadcaster_user_id: userData.userId });
    console.log({ res });
  });

  eventsub.on('debug', (msg) => {
    if(typeof msg == 'object') msg = JSON.stringify(msg, null, 2);
    console.log(`[DEBUG]: ${msg}`);
  });
  
  eventsub.on('channel.channel_points_custom_reward_redemption.add', async (redeem) => {
    /** @type {userData['redeems']} */
    let updatedRedeems = require(`${resourcePath}/userData.json`).redeems;
    if(updatedRedeems[redeem.reward.id]) {
      if(updatedRedeems[redeem.reward.id][0] == 'tap') {
        await tapKeys(updatedRedeems[redeem.reward.id].shift());
      } else {
        if(updatedRedeems[redeem.reward.id][2] == '') {
          await keyboard.pressKey(Number(updatedRedeems[redeem.reward.id][1]));
          await keyboard.releaseKey(Number(updatedRedeems[redeem.reward.id][1]));
        } else {
          await keyboard.pressKey(Number(updatedRedeems[redeem.reward.id][1]), Number(updatedRedeems[redeem.reward.id][2]));
          await keyboard.releaseKey(Number(updatedRedeems[redeem.reward.id][1]), Number(updatedRedeems[redeem.reward.id][2]));
        }
      } 
    }
  
    delete require.cache[require.resolve(`${resourcePath}/userData.json`)];
  });
}

async function tapKeys(keys) {
  keys.forEach(async code => {
    await keyboard.pressKey(Number(code));
    await keyboard.releaseKey(Number(code));
  })
}

app.whenReady().then(() => {
  const tray = new Tray(`${__dirname}/TBP.ico`);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show / Hide App', click: () => {
      if(win.isVisible()) win.hide();
      else win.show();
    }},
    { label: 'Quit', click: () => process.exit() }
  ]);

  createStartWindow();

  app.on('activate', () => {
    if(BrowserWindow.getAllWindows().length == 0) createStartWindow();
  });

  tray.setToolTip('TBP');
  tray.setContextMenu(contextMenu);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
});

/**
 * @typedef userData
 * @property {string} userId
 * @property {string} token
 * @property {string} vtsToken
 * @property {string} refresh
 * @property {Record<string, string[]>} redeems
 */