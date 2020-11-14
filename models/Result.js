const {
    CODE_ERROR,
    CODE_SUCCESS,
    CODE_TOKEN_EXPIRED
  } = require('../utils/constant')
  
  class Result {
    // 构造函数
    // 三个参数  data：向前端返回的数据，msg：向前端返回的信息, options:辅助信息
    constructor(data, msg = '操作成功', options) {
      this.data = null
      if (arguments.length === 0) { // 不传参数
        this.msg = '操作成功'
      } else if (arguments.length === 1) { // 只传一个参数 msg
        this.msg = data
      } else { // 
        this.data = data
        this.msg = msg
        if (options) {
          this.options = options
        }
      }
    }
  
    createResult() {
      if (!this.code) {
        this.code = CODE_SUCCESS
      }
      let base = {
        code: this.code,
        msg: this.msg
      }
      if (this.data) {
        base.data = this.data
      }
      if (this.options) {
        // base = { ...base, ...this.options }
        Object.assign(base, this.options)
      }
      console.log(base) // {code, msg, data, ...}
      return base
    }
  
    json(res) {
      res.json(this.createResult())
    }
  
    // 成功的调用方法
    success(res) {
        // throw new Error('error12345....')
      this.code = CODE_SUCCESS
      this.json(res)
    }
  
    // 失败的调用方法
    fail(res) {
      this.code = CODE_ERROR
      this.json(res)
    }

    // token失效调用方法
    jwtError(res) {
      this.code = CODE_TOKEN_EXPIRED
      this.json(res)
    }
  }
  
  module.exports = Result