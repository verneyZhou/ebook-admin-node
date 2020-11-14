const express = require('express');
const router = require('./router');
const fs = require('fs');
const https = require('https');

// body-parser是一个HTTP请求体解析的中间件，使用这个模块可以解析JSON、Raw、文本、URL-encoded格式的请求体
const bodyParser = require('body-parser');

// 解决跨域问题
const cors = require('cors');


const app = express();

///
app.use(bodyParser.urlencoded({ extended: true }))
// 解析 application/json
app.use(bodyParser.json())
///
app.use(cors());


// 挂载router中间件
app.use('/', router);


////// 中间件
// 中间件需要在响应结束前被调用
// function myLogger(req, res, next) {
//     console.log('=====my logger');

//     next(); // 代码往下执行
// }
// app.use(myLogger);
//////


// app.get('/', function(req,res) {
//     // res.send('hello node')

//     throw new Error('=======error...')
// })


/// 自定义异常处理中间件
// 第一，参数一个不能少，否则会视为普通的中间件
// 第二，中间件需要在请求之后引用
// const errorHandler = function(err, req, res, next) {
//     console.log('====errorHandler...',err);
//     res.status(500).json({
//         error: -1,
//         msg: err.toString()
//     });
//     // res.send('down...');
// }
// app.use(errorHandler);
//////


const server = app.listen(5000, function() {
    const {address, port} = server.address();
    console.log('======Http server is running on http://%s:%s', address, port);
})


/////// 启动https服务
const privateKey =  fs.readFileSync('./https/verneyzhou-code.cn.key', 'utf8')
const certificate =  fs.readFileSync('./https/verneyzhou-code.cn.pem', 'utf8')
// 证书
const credentials = { key: privateKey, cert: certificate }
// 创建https服务
const httpsServer = https.createServer(credentials, app)
const SSLPORT = 18082
httpsServer.listen(SSLPORT, function() {
  console.log('HTTPS Server is running on: https://localhost:%s', SSLPORT)
})
////////