const express = require('express')
const Result = require('../models/Result');
const {login, findUser} = require('../services/user');
const {PWD_SALT, PRIVATE_KEY, JWT_EXPIRED} = require('../utils/constant');
const {md5, decode} = require('../utils/index');

const { body, validationResult } = require('express-validator') // 参数校验 
const boom = require('boom');

const jwt = require('jsonwebtoken'); // jwt加密

const router = express.Router()

router.post(
  '/login',
  [
    body('username').isString().withMessage('用户名必须为字符'), // 通过body方法，对参数类型进行校验，判断是否为字符串，不是则给提示
    body('password').isNumeric().withMessage('密码必须为数字')
  ],
  function(req, res, next) {
  // 需在app.js中使用bodyParser解析req.body之后，才能打印出来
  console.log('====/user/login ===req', req.body)

  const err = validationResult(req);
  console.log('=====express-validator err:',err);

  if (!err.isEmpty()) { // 有报错信息
    const [{msg}] = err.errors;
    // 将msg通过next方法传递给下一个中间件boom执行
    next(boom.badRequest(msg)) // 400错误，参数异常
  } else {
    let {username, password} = req.body;
    password = md5(`${password}${PWD_SALT}`); // 加密
    // res.json({
    //   code: 0,
    //   msg: '登录成功'
    // })
  
    //a. 不传参数，返回成功信息 {code:1, msg:'操作成功'}
    // new Result().success(res)
  
    //b. 传一个参数
    // new Result('登录成功').success(res)
  
  
    //c. 
    // if (username === 'admin' && password === '123456') {
    //   new Result('登录成功').success(res)
    // } else {
    //   new Result('登录失败').fail(res)
    // }
  
   
    //// 查询mysql数据库
    login(username, password).then(user => {
      console.log('======user',user);
      if (!user || user.length === 0) {
        new Result('登录失败').fail(res)
      } else {

        ////生成token
        const token = jwt.sign(
          {username},
          PRIVATE_KEY,
          {expiresIn: JWT_EXPIRED}
        )

        ////
        new Result({token }, '登录成功').success(res)
      }
    }).catch(e => {
      console.log('=====login error',e);
    })
    ////
  }

})




// router.get('/info', function(req, res, next) {
//   res.json('user info...')
// })

router.get('/info', function(req, res, next) {
  console.log('====/user/info ===req', req.body)
  //// 通过jwt动态的获取用户名
  const decoded = decode(req)
  console.log('====docoded', decoded);
  if (decoded && decoded.username) {
    findUser('admin').then(user => {
      console.log('======user',user);
      if (user) {
        user.roles = [user.role];
        new Result(user, '用户信息查询成功').success(res);
      } else {
        new Result(user, '用户信息查询失败').fail(res);
      }
      
    })
  }

})


module.exports = router