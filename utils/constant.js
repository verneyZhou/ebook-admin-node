

const { env } = require('./env')
const UPLOAD_PATH = env === 'dev' ?
  '/Users/admin/upload/admin-upload-ebook' :
  '/root/upload/admin-upload-ebook'

const UPLOAD_URL = env === 'dev' ? 'https://www.verneyzhou-code.cn/admin-upload-ebook' : 'https://www.verneyzhou-code.cn/admin-upload-ebook'

const OLD_UPLOAD_URL = env === 'dev' ? 'https://www.verneyzhou-code.cn/book/res/img' : 'https://www.verneyzhou-code.cn/book/res/img'




module.exports = {
  CODE_ERROR: -1,
  CODE_SUCCESS: 0,
  CODE_TOKEN_EXPIRED: -2,
  debug: true,
  PWD_SALT: 'admin_imooc_node',
  PRIVATE_KEY: 'admin_imooc_node_verneyzhou_code', // 私钥
  JWT_EXPIRED: 60 * 60, // token失效时间 秒级 
  UPLOAD_PATH,
  MIME_TYPE_EPUB: 'application/epub+zip',
  UPLOAD_URL,
  OLD_UPLOAD_URL
}