

const {querySql,queryOne } = require('../db');



function login(username, password) {

    //// 查询mysql数据库
    const sql = `select * from admin_user where username='${username}' and password='${password}'`
    return querySql(sql)
    // querySql('select * from admin_user').then(res => {
    //     // console.log('====mysql res',res);
    // }).catch(err => {
    //     // console.log('====mysql err',err);
    // })
    /////
}


function findUser(username, password) {
    //// 查询mysql数据库
    // const sql = `select * from admin_user where username='${username}'`
    const sql = `select id, username, nickname, role, avatar from admin_user where username='${username}'` // 过滤掉password
    return queryOne(sql)
}

module.exports = {
    login,
    findUser
}