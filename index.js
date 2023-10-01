const { app, BrowserWindow } = require('electron');
const { keyboard, Key } = require('@nut-tree/nut-js');
const { EventSub } = require('twitch-utils');
const config = require('./config.json');
const fs = require('fs');

const resourcePath = process.resourcesPath;

/** @type {?EventSub} */
var eventsub;

/** @type {?userData} */
var userData;

function createStartWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800
  });

  if(!fs.existsSync(`${resourcePath}/userData.json`)) {
    require('./backend')(null);
    win.loadURL('http://localhost:6060/getInfo');
  } else {
    userData = require(`${resourcePath}/userData.json`);
    eventsub = new EventSub(config['client-id'], config['client-secret'], { api: { 
      client_token: userData.token,
      refresh_token: userData.refresh,
      customTokens: false
    }});

    require('./backend')(eventsub.api);
    eventsub.connect({ type: "websocket" });

    win.setSize(500, 800);
    win.loadURL('http://localhost:6060/config');

    eventsub.once('online', async () => {
      const res = await eventsub.subscribe('channel.channel_points_custom_reward_redemption.add', 1, { broadcaster_user_id: userData.userId });
      console.log({ res });
    });

    eventsub.on('debug', (msg) => {
      if(typeof msg == 'object') msg = JSON.stringify(msg, null, 2)
      console.log(`[DEBUG]: ${msg}`);
    });

    eventsub.on('raw', (packet) => {
      if(typeof packet !== 'string') packet = JSON.stringify(packet, null, 2)
      console.log(`[RAW PACKET]: ${packet}`);
    })
    
    eventsub.on('channel.channel_points_custom_reward_redemption.add', async (redeem) => {
      /** @type {userData['redeems']} */
      let updatedRedeems = require(`${resourcePath}/userData.json`).redeems;
      if(updatedRedeems[redeem.reward.id]) {
        if(updatedRedeems[redeem.reward.id][1] == '') {
          await keyboard.pressKey(Number(updatedRedeems[redeem.reward.id][0]));
          await keyboard.releaseKey(Number(updatedRedeems[redeem.reward.id][0]));
        } else {
          await keyboard.pressKey(Number(updatedRedeems[redeem.reward.id][0]), Number(updatedRedeems[redeem.reward.id][1]));
          await keyboard.releaseKey(Number(updatedRedeems[redeem.reward.id][0]), Number(updatedRedeems[redeem.reward.id][1]));
        }
      }
    
      delete require.cache[require.resolve(`${resourcePath}/userData.json`)];
    });
  }
};



app.whenReady().then(() => {
  createStartWindow();

  app.on('activate', () => {
    if(BrowserWindow.getAllWindows().length == 0) createStartWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
});

/**
 * @typedef userData
 * @property {string} userId
 * @property {string} token
 * @property {string} refresh
 * @property {Record<string, string[]>} redeems
 */