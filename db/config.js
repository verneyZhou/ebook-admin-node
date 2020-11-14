
const env = require('../utils/env');


let host,user,password;


if (env === 'env') { // 开发环境  本地mysql
  host = 'localhost';
  user = 'root';
  password = '20201013zyZY';
} else { // 线上环境  阿里云服务器mysql
  host = '123.57.172.182';
  user = 'root';
  password = '2020zyZY'
}





module.exports = {
    host, // 数据库主机的ip地址或域名
    user, // 用户名
    password, // 密码
    database: 'book' // 数据库
  }