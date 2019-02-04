var fs = require('fs');
var clArgs = require('optimist').argv;
var ini = require('ini');
var common = require('./common');
var upperCase = require('upper-case');
var path = require('path');
var macaroonPath = '';
var options = {};
var file_path = path.normalize(__dirname) + '/RTL.conf';
var log_file_path = path.normalize(__dirname) + '/RTL.log';  

var defaultConfig = {
  Authentication: {
    lndServerUrl:'https://localhost:8080/v1',
    macaroonPath:'',
    nodeAuthType:'DEFAULT',
    lndConfigPath:'',
    bitcoindConfigPath: '',
    rtlPass:'',
    enableLogging: false
  },
  Settings: {
    flgSidenavOpened:true,
    flgSidenavPinned:true,
    menu:'Vertical',
    menuType:'Regular',
    theme:'dark-blue',
    satsToBTC:false
  }
};

var setMacaroonPath = (clArgs, config) => {
  if(undefined !== clArgs.lndir) {
    macaroonPath = clArgs.lndir;
  } else {
    if(undefined !== config.Authentication.macroonPath && config.Authentication.macroonPath !== '') {
      macaroonPath = config.Authentication.macroonPath;
    } else if(undefined !== config.Authentication.macaroonPath && config.Authentication.macaroonPath !== '') {
      macaroonPath = config.Authentication.macaroonPath;
    }
  }
}

var validateConfigFile = (macaroonPath, config) => {
  if(macaroonPath === '' || undefined === macaroonPath) {
    errMsg = 'Please set macaroon path in RTL.conf';
  }
  
  if(config.Authentication.lndServerUrl === '' ||  undefined === config.Authentication.lndServerUrl) {
    errMsg = errMsg + '\nPlease set LND Server URL in RTL.conf';
  } else {
    common.lnd_server_url = config.Authentication.lndServerUrl;
  }
  
  if(config.Authentication.nodeAuthType === '' ||  undefined === config.Authentication.nodeAuthType) {
    errMsg = errMsg + '\nPlease set Node Auth Type in RTL.conf';
  }
  
  if(upperCase(config.Authentication.nodeAuthType) === 'DEFAULT' && (config.Authentication.lndConfigPath === '' ||  undefined === config.Authentication.lndConfigPath)) {
    errMsg = errMsg + '\nDefault Node Authentication can be set with LND Config Path only. Please set LND Config Path in RTL.conf';
  } else {
    common.lnd_config_path = config.Authentication.lndConfigPath;
  }

  if(config.Authentication.bitcoindConfigPath !== '' ||  undefined !== config.Authentication.bitcoindConfigPath) {
    common.bitcoind_config_path = config.Authentication.bitcoindConfigPath;
  }

  if(upperCase(config.Authentication.nodeAuthType) === 'CUSTOM' && (config.Authentication.rtlPass === '' ||  undefined === config.Authentication.rtlPass)) {
    errMsg = errMsg + '\nCustom Node Authentication can be set with RTL password only. Please set RTL Password in RTL.conf';
  }

  if(undefined !== config.Authentication.enableLogging) {
    common.enable_logging = config.Authentication.enableLogging;
    let exists = fs.existsSync(log_file_path);
    if(exists) {
      fs.writeFile(log_file_path, '', () => {});
    } else if (!exists && config.Authentication.enableLogging) {
      try {
        var createStream = fs.createWriteStream(log_file_path);
        createStream.end();
      }
      catch(err) {
        console.error('Something went wrong, unable to create log file!' + err);
      }
    } 
  }

  if(errMsg !== '') {
    throw new Error(errMsg);
  }
}

var setOptions = (macaroonPath) => {
  var macaroon = fs.readFileSync(macaroonPath + '/admin.macaroon').toString('hex');
  options = {
    url: '',
    rejectUnauthorized: false,
    json: true,
    headers: {
      'Grpc-Metadata-macaroon': macaroon,
    },
    form: ''
  };
}

var errMsg = '';
var configFileExists = () => {
  let exists = fs.existsSync(file_path);
  if (exists) {
    var config = ini.parse(fs.readFileSync(file_path, 'utf-8'));
    setMacaroonPath(clArgs, config)
    validateConfigFile(macaroonPath, config);
    setOptions(macaroonPath);
  } else {
    try {
      fs.writeFileSync(file_path, ini.stringify(defaultConfig));
      var config = ini.parse(fs.readFileSync(file_path, 'utf-8'));
      setMacaroonPath(clArgs, config)
      validateConfigFile(macaroonPath, config);
      setOptions(macaroonPath);
    }
    catch(err) {
      console.error('Something went wrong, unable to create config file!' + err);
    }
  }
}
configFileExists();
module.exports = options;
