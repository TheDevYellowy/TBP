const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const config = require('./config.json');
const { API } = require('twitch-utils');

const resPath = process.resourcesPath;

/**
 * @typedef userData
 * @property {string} userId
 * @property {string} token
 * @property {string} refresh
 * @property {Record<string, string[]>} redeems
 */

const { Key } = require('@nut-tree/nut-js');
const keys = [
  ['none', null],
  ['a', Key.A],
  ['b', Key.B],
  ['c', Key.C],
  ['d', Key.D],
  ['e', Key.E],
  ['f', Key.F],
  ['g', Key.G],
  ['h', Key.H],
  ['i', Key.I],
  ['j', Key.J],
  ['k', Key.K],
  ['l', Key.L],
  ['m', Key.M],
  ['n', Key.N],
  ['o', Key.O],
  ['p', Key.P],
  ['q', Key.Q],
  ['r', Key.R],
  ['s', Key.S],
  ['t', Key.T],
  ['u', Key.U],
  ['v', Key.V],
  ['w', Key.W],
  ['x', Key.X],
  ['y', Key.Y],
  ['z', Key.Z],
  ['0', Key.Num0],
  ['1', Key.Num1],
  ['2', Key.Num2],
  ['3', Key.Num3],
  ['4', Key.Num4],
  ['5', Key.Num5],
  ['6', Key.Num6],
  ['7', Key.Num7],
  ['8', Key.Num8],
  ['9', Key.Num9],
  ['Left Ctrl', Key.LeftControl],
  ['Left Alt', Key.LeftAlt],
  ['Right Ctrl', Key.RightControl],
  ['Right Alt', Key.RightAlt],
  ['f1', Key.F1],
  ['f2', Key.F2],
  ['f3', Key.F3],
  ['f4', Key.F4],
  ['f5', Key.F5],
  ['f6', Key.F6],
  ['f7', Key.F7],
  ['f8', Key.F8],
  ['f9', Key.F9],
  ['f10', Key.F10],
  ['f11', Key.F11],
  ['f12', Key.F12]
]

/** @param {?API} api */
module.exports = (api = null) => {
  app
    .use(express.json())
    .use(express.urlencoded({ extended: true }))
    .engine('html', require('ejs').renderFile)
    .set('view engine', 'ejs')
    .set('views', path.join(__dirname, 'views'))
    .get('/getInfo', (req, res) => {
      res.render('getInfo', {
        twitchURL: `https://id.twitch.tv/oauth2/authorize?force_verify=true&response_type=code&client_id=${config['client-id']}&client_secret=${config['client-secret']}&redirect_uri=${encodeURI('http://localhost:6060/api')}&scope=${encodeURI(config.scopes.join(' '))}`
      });
    })
    .get('/quit', (req, res) => {
      res.render('quit');

      setTimeout(() => process.exit(), 5500);
    })
    .get('/config', async (req, res) => {
      /** @type {userData} */
      const data = require(`${resPath}/userData.json`);
      const rewards = await api?.get(`channel_points/custom_rewards?broadcaster_id=${data.userId}`);

      if(typeof rewards == 'string' || typeof rewards == 'undefined') {}
      else {
        const a = [];
        const b = [];

        rewards.data.forEach(reward => {
          if(data.redeems[reward.id]) { a.push({ ...reward, keys: data.redeems[reward.id] }) }
          else b.push(reward);
        });

        res.render('config', {
          a,b,keys
        });
      }
    })
    .get('/api', async (req, res) => {
      if (req.query.error) return res.redirect(req.originalUrl);
      if (!req.query.code) return res.redirect(req.originalUrl);
      
      const params = new URLSearchParams();
      params.set('client_id', config['client-id']);
      params.set('client_secret', config['client-secret']);
      params.set('code', req.query.code);
      params.set('redirect_uri', 'http://localhost:6060/api');
      params.set('grant_type', 'authorization_code');

      const resp = await fetch('https://id.twitch.tv/oauth2/token', {
        method: "POST",
        body: params.toString(),
        headers: {
          'Content-Type': "application/x-www-form-urlencoded"
        }
      }).catch(() => { res.redirect(req.originalUrl) });

      const token = await resp.json();
      console.log({ token });
      if (token.error || !token.access_token) return res.redirect(req.originalUrl);

      const data = await (await fetch(`https://api.twitch.tv/helix/users`, {
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
          'Client-Id': config['client-id'],
        }
      })).json();

      console.log({ data: data.data });

      const userData = {
        token: token.access_token,
        refresh: token.refresh_token,
        userId: data.data[0].id,
        redeems: {}
      }

      fs.writeFileSync(`${resPath}/userData.json`, JSON.stringify(userData));

      res.redirect('/quit');
    })
    .post('/addData', async (req, res) => {
      /** @type {userData} */
      let data = require(`${resPath}/userData.json`);
      const body = req.body;
      console.log(body)

      if('add' in body) {
        const key = Object.keys(body.add)[0];
        let arrNums = body[key];

        data.redeems[key] = arrNums;
      }

      if('edit' in body) {
        const key = Object.keys(body.edit)[0];
        let arrNums = body[key];

        data.redeems[key] = arrNums;
      }

      fs.writeFileSync(`${resPath}/userData.json`, JSON.stringify(data));

      res.redirect('/config');
    })
    .listen(6060);

  api?.on('refreshToken', (token, _) => {
    let temp = require(`${resPath}/userData.json`);
    fs.writeFileSync(`${resPath}/userData.json`, JSON.stringify({ ...temp, token: token }));
  });
}