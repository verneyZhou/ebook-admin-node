const mysql = require('mysql');
const {host, user, password, database} = require('./config');
const {debug} = require('../utils/constant')
const {isObject} = require('../utils');

 

// 连接数据库
function connect() {
    return mysql.createConnection({
      host,
      user,
      password,
      database,
      multipleStatements: true
    })
  }


// 查询多个，返回数据
function querySql(sql) {
    const conn = connect();
    debug && console.log('====sql:',sql); // 日志
    return new Promise((resolve, reject) => {
        try {
            conn.query(sql, (err, results) => {
                if (err) {
                    debug && console.log('查询失败，原因:' + JSON.stringify(err))
                    reject(err);
                } else {
                    debug && console.log('查询成功', JSON.stringify(results))
                    resolve(results);
                }
            })
        } catch(e) {
            reject(e)
        } finally {
            conn.end() // 释放连接，避免造成内存泄露
        }
    })
}

// 查询单个
function queryOne(sql) {
    return new Promise((resolve, reject) => {
        querySql(sql).then(res => {
            if (res && res.length > 0) {
                resolve(res[0])
            } else {
                resolve(null)
            }
        }).catch(err => {
            reject(err)
        })
    })
}


// 插入单条数据
function insertSql(model, tableName) {
    return new Promise((resolve, reject) => {
        if (!isObject(model)) {
            reject(new Error('添加图书为非对象，请检查'))
        } else {
            const keys = []
            const values = []

            // SQL解析
            Object.keys(model).forEach(key => {
                if (model.hasOwnProperty(key)) { // 判断v是否是model自身创建的key，不是从其他原型链上继承过来的key
                    keys.push(`\`${key}\``) // 防止字段有些key是关键字
                    values.push(`'${model[key]}'`)
                }
            })
            if (keys.length > 0 && values.length > 0) {
                let sql = `INSERT INTO \`${tableName}\``
                const keysString = keys.join(',')
                const valuesString = values.join(',')
                sql = `${sql} (${keysString}) VALUES (${valuesString})`
                debug && console.log('=====create book sql',sql);

                // 创建sql连接
                const conn = connect();
                try {
                    conn.query(sql, (err, result) => {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(result)
                        }
                    })
                } catch(err) {
                    reject(err)
                } finally {
                    conn.end()
                }
            } else {
                reject(new Error('SQL解析失败'))
            }
        }
    })
}

// 更新
function updateSql(model, tableName, where) {
    return new Promise((resolve, reject) => {
        if (!isObject(model)) {
            reject(new Error('更新图书为非对象，请检查'))
        } else {
            const entry = []
            Object.keys(model).forEach(key => {
                if (model.hasOwnProperty(key)) {
                entry.push(`\`${key}\`='${model[key]}'`)
                }
            })
            if (entry.length > 0) {
                let sql = `UPDATE \`${tableName}\` SET`
                sql = `${sql} ${entry.join(',')} ${where}`
                console.log('======update sql', sql)
                const conn = connect()
                try {
                conn.query(sql, (err, result) => {
                    if (err) {
                    reject(err)
                    } else {
                    resolve(result)
                    }
                })
                } catch (e) {
                reject(e)
                } finally {
                conn.end()
                }
            } else {
                reject(new Error('SQL解析失败'))
            }
        }
    })
}

//  and 精确查询
function andSql(where, k, v) {
    if (where === 'where') {
        return `${where} \`${k}\`='${v}'`
    } else {
        return `${where} and \`${k}\`='${v}'`
    }
}


//  andLike 模糊查询
function andLikeSql(where, k, v) {
    if (where === 'where') {
        return `${where} \`${k}\` like '%${v}%'`
    } else {
        return `${where} and \`${k}\` like '%${v}%'`
    }
}

module.exports = {
    querySql,
    queryOne,
    insertSql,
    updateSql,
    andSql,
    andLikeSql
}