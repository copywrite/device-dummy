var router = require('koa-router')();
const osxBrightness = require('osx-brightness');
var adb = require('adbkit');
var client = adb.createClient();
var robot = require("robotjs");
var exec = require('child_process').exec;
var directLoginCycle = 0;

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

router.get('/screen/routine', async function(ctx, next) {
  directLoginCycle++;
  console.log('DirectLoginCycle', directLoginCycle);

  if (directLoginCycle > 1) {
    console.log('DirectLoginCycle stoped.');
    ctx.body = {
      routine: false,
      success: false
    };
  }

  var screenRect = robot.getScreenSize();

  if (screenRect) {
    console.log('Screen Size:', screenRect);
    var mouse = robot.getMousePos();
    if (screenRect.width == 1440 && screenRect.height == 900) {
      var state = robot.getPixelColor(755, 103);
      console.log('State color:', state);
      if (state == '2abb2f') {
        console.log('State is online');
        var color = robot.getPixelColor(756, 751);
        console.log('Target color:', color);
        if (color == '158db2') {
          console.log('Target found.')
          await execute('pkill -a -i "Google Chrome"');
          await sleep(200);
          robot.moveMouse(756, 751);
          robot.mouseClick();
        } else {
          console.log('Target not found.')
        }
      } else {
        console.log('State is not online');
      }
    } else if (screenRect.width == 1280 && screenRect.height == 800) {
      var state = robot.getPixelColor(638, 350);
      console.log('State color:', state);
      if (state == '28b62d' || state == '2abb2f') {
        console.log('State is online');
        var color = robot.getPixelColor(640, 652);
        console.log('Target color:', color);
        if (color == '158db2') {
          console.log('Target found.')
          await execute('pkill -a -i "Google Chrome"');
          await sleep(2000);
          robot.moveMouse(640, 652);
          robot.mouseClick();
        } else {
          console.log('Target not found.')
        }
      } else {
        console.log('State is not online');
      }
    }

    ctx.body = {
      routine: true,
      success: true
    };
  } else {
    ctx.body = {
      routine: false,
      success: false
    };
  }
});

router.get('/screen/routine/resetCycle', async function(ctx, next) {
  directLoginCycle = 0;

  ctx.body = {
    success: true
  };
});

router.get('/screen/routine/cycle', async function(ctx, next) {
  ctx.body = {
    directLoginCycle: directLoginCycle,
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

async function execute(command, debug) {
  console.log(command);
  return new Promise((resolve, reject) => {
    exec(command, function(error, stdout, stderr) {
      console.log(command + ' executed');

      if (debug) {
        console.log(stdout);
        console.log(error);
        console.log(stderr);
      }

      {
        resolve(stdout);
      }
    })
  });
}

async function sleep(timeout) {
  return new Promise((resolve, reject) => {
    setTimeout(function() {
      console.log('Sleep:' + timeout);
      resolve();
    }, timeout);
  });
}

module.exports = router;
