var router = require('koa-router')();
const osxBrightness = require('osx-brightness');
var adb = require('adbkit');
var client = adb.createClient();

router.get('/', async function(ctx, next) {
  ctx.state = {
    title: 'Hello'
  };

  await ctx.render('index', {});
})

router.get('/screen/toggle', async function(ctx, next) {
  var bright = 0;
  await osxBrightness.get()
    .then(brightness => {
      bright = brightness;
      console.log('Current brightness:' + brightness);

      if (bright > 0) {
        bright = 0;
      } else {
        bright = 0.4;
      }

      osxBrightness.set(bright)
        .then(() => {
          console.log('Changed brightness to ' + bright);
        });
    });

  ctx.body = {
    brightness: bright,
    success: true
  };
});

router.get('/mobile/toggle', async function(ctx, next) {
  var devices = await client.listDevices();
  await debug(devices);
  if (devices == undefined || devices.length == 0) {
    ctx.body = {
      devices: false,
      success: false
    };
  }

  var status = await powerStatus(devices[0]);
  await debug(status);

  ctx.body = {
    lock: true,
    success: true
  };
});

async function powerStatus(device) {
  return new Promise((resolve, reject) => {
    client.shell(device.id,
        'dumpsys power|grep "Display Power"')
      .then(adb.util.readAll)
      .then(function(output) {
        console.log('[%s] %s', device.id, output.toString().trim());
        var status = statusParser(output.toString().trim());
        resolve(status);
      })
  });
}

async function debug(msg) {
  return new Promise((resolve, reject) => {
    console.log(msg);
    resolve();
  });
}

var statusParser = function(status) {
  if (status) {
    if ("Display Power: state=ON" === status) {
      return true;
    } else {
      return false;
    }
  }
}

module.exports = router;
