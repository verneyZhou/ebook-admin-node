
const Book = require('../models/Book');
const {
    insertSql,
    queryOne,
    querySql,
    updateSql,
    andLikeSql,
    andSql
} = require('../db');
const _ = require('lodash');


// 判断是都已存在
function exists(book) {
    // 当title,author,publisher字段都存在，即存在
    const {title, author, publisher} = book
    const sql = `select * from book where title='${title}' and
    author='${author}' and publisher='${publisher}'`
    // return null
    return queryOne(sql)
}


// 移除
async function removeBook(book) {
    if (book) {
        book.reset(); // 删除本地服务器数据

        // 删除sql数据库
        if (book.fileName) {
            const removeBookSql = `delete from book where fileName='${book.fileName}'`
            const removeContentsSql = `delete from contents where fileName='${book.fileName}'`
            await querySql(removeBookSql)
            await querySql(removeContentsSql)
        }
    }
}


// 嵌入目录
async function insertContents(book) {
    const contents = book.getContents();
    console.log('=====insertContents', contents)
    if (contents && contents.length > 0) {
        for(let i = 0; i < contents.length; i ++) {
            const content = contents[i];

            // 调用loash中的pick方法，对照数据库中字段插入
            const _content = _.pick(content, [
                'fileName',
                'id',
                'href',
                'order',
                'level',
                'label',
                'pid',
                'navId',
                'text'
            ])
            console.log('====_content', _content)
            await insertSql(_content, 'contents') // 插入sql
        }
    }
}



// 插入电子书
function insertBook(book) {
    return new Promise( async (resolve, reject) => {
        try {
            if (book instanceof Book) { // 判断book是否是Book实例

                const result =  await exists(book);
                console.log('====result',result)
                if (result) {
                    await removeBook(book)
                    reject(new Error('电子书已存在'))
                } else {
                    // 插入sql
                    await insertSql(book.toDb(), 'book')

                    // 插入目录
                    await insertContents(book)
                    resolve()

                }
            } else {
                reject(new Error('添加的图书对象不合法'))
            }
         } catch(e){
            reject(e)
        }
    })
}


// 更新电子书
function updateBook(book) {
    return new Promise( async (resolve, reject) => {
        try {
            if (book instanceof Book) { // 判断book是否是Book实例

                const result = await getBook(book.fileName)
                if (result) {
                    const model = book.toDb();
                    if (+result.updateType === 0) {
                        reject(new Error('内置图书不能编辑'))
                    } else {
                        await updateSql(model, 'book', `where fileName='${book.fileName}'`)
                        resolve()
                    }
                } else {

                }
            } else {
                reject(new Error('添加的图书对象不合法'))
            }
         } catch(e){
            reject(e)
        }
    })
}


// 获取图书详情
function getBook(fileName) {
    // return new Promise ((resolve, reject) => {
    //     resolve({fileName})
    // })

    return new Promise ( async (resolve, reject) => {
        const bookSql = `select * from book where fileName='${fileName}'`
        const contentsSql = `select * from contents where fileName='${fileName}' order by \`order\``
        const book = await queryOne(bookSql)
        const contents = await querySql(contentsSql)

        if (book) {
            book.cover = Book.getCoverUrl(book)
            book.contents = contents
            book.contentsTree = Book.getContentsTree(contents)
            resolve(book)
        } else {
            reject(new Error('电子书不存在'))
        }
        
        
    })
}


// 获取图书分类
async function getCategory() {
    const sql = 'select * from category order by category asc'
    const result = await querySql(sql)
    const categoryList = []
    result.forEach(item => {
      categoryList.push({
        label: item.categoryText,
        value: item.category,
        num: item.num
      })
    })
    return categoryList
}

// 获取图书列表
async function listBook(query) {
    console.log('=====listBook query',query)
    const {category, author, title, sort, page = 1, pageSize = 20} = query
    
    let bookSql = 'select * from book'
    let where = 'where'

    // 查询
    title && (where = andLikeSql(where, 'title', title)) // 模糊查询
    author && (where = andLikeSql(where, 'author', author))
    category && (where = andSql(where, 'category', category)) // 精确查询
    if (where !== 'where') { // 有查询条件
        bookSql = `${bookSql} ${where}`
    }

    // 排序
    if (sort) {
        const symbol = sort[0]
        const column = sort.slice(1, sort.length)
        const order = symbol === '+' ? 'asc' : 'desc'
        bookSql = `${bookSql} order by \`${column}\` ${order}`
    }

    // 偏移
    const offset = (page - 1) * pageSize // 偏移量

    bookSql = `${bookSql} limit ${pageSize} offset ${offset}`
    console.log('=======listBook bookSql', bookSql)
    const list = await querySql(bookSql)
    // 封面路径优化
    list.forEach(v => v.cover = Book.getCoverUrl(v))

    ////// 查询数量sql
    let countSql = `select count(*) as count from book`
    if (where !== 'where') { // 有查询条件
        countSql = `${countSql} ${where}`
    }
    const count = await querySql(countSql)
    console.log('======listBook count',count)
    ///////


    return {list, count: count[0].count, page, pageSize}
}


// 删除电子书
function deleteBook(fileName) {
    return new Promise(async (resolve, reject) => {
        try {
            const book = await getBook(fileName)
            if (book) {
                if (+book.updateType === 0) {
                    reject(new Error('内置电子书不能删除'))
                } else {
                    const bookObj = new Book(null, book)
                    const sql = `delete from book where fileName='${fileName}'`
                    querySql(sql).then(() => {
                        bookObj.reset()
                        resolve() 
                    })
                }
            } else {
                reject(new Error('删除电子书不存在'))
            }
        } catch(e) {
            reject(e)
        }
    })
}


module.exports = {
    insertBook,
    updateBook,
    getBook,
    getCategory,
    listBook,
    deleteBook
}