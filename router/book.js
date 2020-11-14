

const express = require('express');
const {UPLOAD_PATH} = require('../utils/constant')
const Result = require('../models/Result')
const Book = require('../models/Book');
const {decode} = require('../utils/index');
const {
    insertBook,
    getBook,
    updateBook,
    getCategory,
    listBook,
    deleteBook
} = require('../services/book');
// 中间件
const multer = require('multer');
const boom = require('boom');

const router = express.Router();


// 上传
router.post(
    '/upload',
    multer({ dest: `${UPLOAD_PATH}/book`}).single('file'),
    function(req, res, next) {
        if (!req.file || req.file.length === 0) {
            new Result('上传电子书失败').fail(res)
        } else {
            const book = new Book(req.file)
            book.parse().then(parse => {
                console.log('====Book parse', parse)
                new Result(parse, '上传电子书成功').success(res)
            }).catch(err => {
                console.log('====upload',err);
                next(boom.badImplementation(err)) // 500
            })
            
        }
    }
)

// 创建
router.post(
    '/create',
    function(req, res, next) {
        const decoded = decode(req);
        if (decoded && decoded.username) {
            req.body.username = decoded.username
        }
        const book = new Book(null, req.body)
        // console.log('====create book',book);

        /// 插入
        insertBook(book).then(result => {
            new Result('添加电子书成功!').success(res)
        }).catch(err => {
            console.log('====create',err);
            next(boom.badImplementation(err)) // 500
        })
       
    }
)


// 更新
router.post(
    '/update',
    function(req, res, next) {
        const decoded = decode(req);
        if (decoded && decoded.username) {
            req.body.username = decoded.username
        }
        const book = new Book(null, req.body)

        /// 更新
        updateBook(book).then(result => {
            new Result('更新电子书成功!').success(res)
        }).catch(err => {
            console.log('====update',err);
            next(boom.badImplementation(err)) // 500
        })
       
    }
)

// 获取详情
router.get(
    '/get',
    function(req, res, next) {
        const {fileName} = req.query
        if (!fileName) {
            next(boom.badRequest(new Error('参数fileName不能为空'))) // 400错误，参数异常
        } else {
            getBook(fileName).then(book => {
                new Result(book, '获取图书信息成功').success(res)
            }).catch(err => {
                next(boom.badImplementation(err)) // 500
            })
        }
    }
)

// 获取文章分类
router.get(
    '/category',
    function(req, res, next) {
        getCategory().then(category => {
            new Result(category, '获取图书分类成功').success(res)
        }).catch(err => {
            next(boom.badImplementation(err)) // 500
        })
    }
)

// 获取图书列表
router.get( 
    '/list',
    function(req, res, next) {
        listBook(req.query).then(({list, count, page, pageSize}) => {
            new Result({list, count, page: +page, pageSize: +pageSize}, '获取图书列表成功').success(res)
        }).catch(err => {
            next(boom.badImplementation(err)) // 500
        })
    }
)

// 删除电子书
router.get(
    '/delete',
    function(req, res, next) {
        const {fileName} = req.query
        if (!fileName) {
            next(boom.badRequest(new Error('参数fileName不能为空'))) // 400错误，参数异常
        } else {
            deleteBook(fileName).then(() => {
                new Result('删除图书成功').success(res)
            }).catch(err => {
                next(boom.badImplementation(err)) // 500
            })
        }
    }
)


module.exports = router

