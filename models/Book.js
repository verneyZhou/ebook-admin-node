
///// 电子书解析

const {
  MIME_TYPE_EPUB,
  UPLOAD_URL,
  UPLOAD_PATH,
  OLD_UPLOAD_URL} = require('../utils/constant')
const fs = require('fs');
const Epub = require('../utils/epub');
const xml2js = require('xml2js').parseString

class Book {
    // 当new实例的时候会调constructor函数
    constructor(file, data) {
        if (file) {
            this.createBookFromFile(file)
        } else {
            this.createBookFromData(data)
        }
    }

    // 创建file数据
    createBookFromFile(file) {
        console.log('====file', file)
        const {
            originalname,
            destination,
            filename,
            mimetype,
            path
        } = file;
        const suffix = mimetype === MIME_TYPE_EPUB ? '.epub' : '' // 后缀名
        const oldBookPath = path; // 原有路径
        const bookPath = `${destination}/${filename}${suffix}` // 文件的新路径
        const url = `${UPLOAD_URL}/book/${filename}${suffix}` // 下载url
        const unzipPath = `${UPLOAD_PATH}/unzip/${filename}` // 解压后的文件夹路径
        const unzipUrl = `${UPLOAD_URL}/unzip/${filename}` // 解压后的文件夹url

        if (!fs.existsSync(unzipPath)) { // existsSync同步判断
            fs.mkdirSync(unzipPath, {recursive: true}) // 迭代创建
        }

        if (fs.existsSync(oldBookPath) && !fs.existsSync(bookPath)) {
            fs.renameSync(oldBookPath, bookPath) // 文件重命名
        }

        this.fileName = filename // 文件名
        this.path = `/book/${filename}${suffix}` // epub文件相对路径
        this.filePath = this.path;
        this.unzipPath = `/unzip/${filename}` // epub解压后的相对路径
        this.url = url; // 下载地址
        this.unzipUrl = unzipUrl // 解压后文件夹路径

        this.title = '' // 电子书标题或书名
        this.author = ''
        this.publisher = ''
        this.contents = []
        this.cover = ''
        this.category = -1 // 分类
        this.categoryText = '' // 分类名称
        this.language = ''
        this.coverPath = '' // 封面路径
        this.originalName = originalname // 文件原名
        

    }


    // 创建data数据
    // 这里添加的字段需要对照sql数据库中字段进行增删，因为会插入到sql中
    createBookFromData(data) {
      this.fileName = data.fileName
      this.cover = data.coverPath
      this.title = data.title
      this.author = data.author
      this.publisher = data.publisher
      this.bookId = data.fileName
      this.language = data.language
      this.rootFile = data.rootFile
      this.originalName = data.originalName
      this.path = data.path || data.filePath
      this.filePath = data.path || data.filePath
      this.unzipPath = data.unzipPath
      this.coverPath = data.coverPath
      this.createUser = data.username
      this.createDt = new Date().getTime()
      this.updateDt = new Date().getTime()
      this.updateType = data.updateType === 0 ? data.updateType : 1 // 来源， 1 手动导入  0 数据库插导入
      this.category = data.category || 99 // 99 自定义分类
      this.categoryText = data.categoryText || '自定义'
      this.contents = data.contents || []
    }


    //// 解析
    parse() {

        return new Promise((resolve, reject) => {
            const bookPath = `${UPLOAD_PATH}${this.filePath}`

            if (!fs.existsSync(bookPath)) {
                reject(new Error('电子书不存在'))
                return
            }

            const epub = new Epub(bookPath);
            epub.on('error', err => {
                reject(err)
            })

            epub.on('end', err => {
                if (err) {
                    reject(err)
                } else {
                    console.log('=======epub.metadata',epub.metadata);
                    const {
                        language,
                        creator,
                        creatorFileAs,
                        title,
                        cover,
                        publisher
                    } = epub.metadata

                    if (!title) {
                        reject(new Error('图书标题为空'))
                    } else {
                        this.title = title;
                        this.language = language || 'en',
                        this.author = creator || creatorFileAs || 'unknown'
                        this.publisher = publisher || 'unknown'
                        this.rootFile = epub.rootFile

                        ///// 获取电子书封面
                        const handleGetImage = (err, file, mimetype) => {
                            console.log('====handleGetImage===',err, file, mimetype)

                            if (err) {
                                reject(err)
                            } else {
                                const suffix = mimetype.split('/')[1]
                                const coverPath = `${UPLOAD_PATH}/img/${this.fileName}.${suffix}`
                                const coverUrl = `${UPLOAD_URL}/img/${this.fileName}.${suffix}`

                                if (!fs.existsSync(`${UPLOAD_PATH}/img`)) { // existsSync同步判断
                                    fs.mkdirSync(`${UPLOAD_PATH}/img`) // 迭代创建
                                }

                                fs.writeFileSync(coverPath, file, 'binary'); // 写入二进制文件
                                this.coverPath = `/img/${this.fileName}.${suffix}`
                                this.cover = coverUrl
;                               resolve(this);
                            }
                        }
                        //////

                        try {
                            this.unzip() // 解压电子书
                            this.parseContents(epub) // 解析内容
                              .then(({ chapters, chapterTree }) => {
                                this.contents = chapters
                                this.contentsTree = chapterTree
                                epub.getImage(cover, handleGetImage) // 获取封面图片
                              })
                              .catch(err => reject(err)) // 解析目录
                        } catch (e) {
                            reject(e)
                        }
                    }
                }
            })

            epub.parse();

        })
        
    }


    //// 解压电子书
    unzip() {
        const AdmZip = require('adm-zip')
        const zip = new AdmZip(Book.genPath(this.path)) // 解析文件路径
        zip.extractAllTo(
          /*target path*/Book.genPath(this.unzipPath),
          /*overwrite*/true
        )
    }



    // 电子书目录解析
    parseContents(epub) {

        // 获取ncx文件路径
        function getNcxFilePath() {
          const manifest = epub && epub.manifest
          const spine = epub && epub.spine
          const ncx = manifest && manifest.ncx
          const toc = spine && spine.toc
          return (ncx && ncx.href) || (toc && toc.href)
        }
    
        /**
         * flatten方法，将目录转为一维数组
         *
         * @param array
         * @returns {*[]}
         */
        function flatten(array) {
          return [].concat(...array.map(item => {
            if (item.navPoint && item.navPoint.length) {
              return [].concat(item, ...flatten(item.navPoint))
            } else if (item.navPoint) {
              return [].concat(item, item.navPoint)
            } else {
              return item
            }
          }))
        }
    
        /**
         * 查询当前目录的父级目录及规定层次
         *
         * @param array
         * @param level
         * @param pid
         */
        function findParent(array, level = 0, pid = '') {
          return array.map(item => {
            item.level = level
            item.pid = pid
            if (item.navPoint && item.navPoint.length) {
              item.navPoint = findParent(item.navPoint, level + 1, item['$'].id)
            } else if (item.navPoint) {
              item.navPoint.level = level + 1
              item.navPoint.pid = item['$'].id
            }
            return item
          })
        }


        console.log('=====rootFile',this.rootFile);
        if (!this.rootFile) {
          throw new Error('目录解析失败')
        } else {
          const fileName = this.fileName
          return new Promise((resolve, reject) => {
            const ncxFilePath = Book.genPath(`${this.unzipPath}/${getNcxFilePath()}`) // 获取ncx文件路径
            const xml = fs.readFileSync(ncxFilePath, 'utf-8') // 读取ncx文件
            // 将ncx文件从xml转为json
            xml2js(xml, {
              explicitArray: false, // 设置为false时，解析结果不会包裹array
              ignoreAttrs: false  // 解析属性
            }, function(err, json) {
              if (!err) {
                const navMap = json.ncx.navMap // 获取ncx的navMap属性
                console.log('======navMap',navMap);
                if (navMap.navPoint) { // 如果navMap属性存在navPoint属性，则说明目录存在
                  navMap.navPoint = findParent(navMap.navPoint)
                  const newNavMap = flatten(navMap.navPoint) // 将目录拆分为扁平结构
                  const chapters = []
                  console.log('=====epub flow',epub.flow);
                  epub.flow.forEach((chapter, index) => { // 遍历epub解析出来的目录
                    // 如果目录大于从ncx解析出来的数量，则直接跳过
                    if (index + 1 > newNavMap.length) {
                      return
                    }
                    const nav = newNavMap[index] // 根据index找到对应的navMap
                    chapter.text = `${UPLOAD_URL}/unzip/${fileName}/${chapter.href}` // 生成章节的URL
                    console.log('=====chapter.text',chapter.text)
                    if (nav && nav.navLabel) { // 从ncx文件中解析出目录的标题
                      chapter.label = nav.navLabel.text || ''
                    } else {
                      chapter.label = ''
                    }
                    chapter.level = nav.level
                    chapter.pid = nav.pid
                    chapter.navId = nav['$'].id
                    chapter.fileName = fileName
                    chapter.order = index + 1
                    chapters.push(chapter)
                  })

                  console.log('====chapters',chapters);
                  const chapterTree = Book.getContentsTree(chapters); // 获取目录树

                  resolve({ chapters, chapterTree })
                } else {
                  reject(new Error('目录解析失败，navMap.navPoint error'))
                }
              } else {
                reject(err)
              }
            })
          })
        }
    }


    // 格式化传给sql数据库的数据
    toDb() {
      return {
        fileName: this.fileName,
        cover: this.cover,
        title: this.title,
        author: this.author,
        publisher: this.publisher,
        bookId: this.bookId,
        language: this.language,
        rootFile: this.rootFile,
        originalName: this.originalName,
        filePath: this.path,
        unzipPath: this.unzipPath,
        coverPath: this.coverPath,
        createUser: this.createUser,
        createDt: this.createDt,
        updateDt: this.updateDt,
        updateType: this.updateType,
        category: this.category || 99,
        categoryText: this.categoryText || '自定义'
      }
    }


    // 获取目录
    getContents() {
      return this.contents
    }


    // 删除
    reset() {
      console.log('====reset',this.path, Book.pathExists(this.path))
      if (this.path && Book.pathExists(this.path)) {
        fs.unlinkSync(Book.genPath(this.path)) // 删除路径
      }
      if (this.filePath && Book.pathExists(this.filePath)) {
        fs.unlinkSync(Book.genPath(this.filePath))
      }
      if (this.coverPath && Book.pathExists(this.coverPath)) {
        fs.unlinkSync(Book.genPath(this.coverPath))
      }
      if (this.unzipPath && Book.pathExists(this.unzipPath)) {
        // 注意node低版本将不支持第二个属性
        fs.rmdirSync(Book.genPath(this.unzipPath), { recursive: true }) // 删除文件夹
      }
    }

     //// 获取路径
    // genPath 是 Book 的一个属性方法，我们可以使用 es6 的 static 属性来实现：
    static genPath(path) {
      if (path.startsWith('/')) {
        return `${UPLOAD_PATH}${path}`
      } else {
        return `${UPLOAD_PATH}/${path}`
      }
    }

    // 判断路径是否存在
    static pathExists(path) {
      if (path.startsWith(UPLOAD_PATH)) {
        return fs.existsSync(path)
      } else {
        return fs.existsSync(Book.genPath(path))
      }
    }



    // 获取封面路径
    static getCoverUrl(book) {
      console.log('getCoverUrl', book)
      if (Number(book.updateType) === 0) { // 非手动上传
        const { cover } = book
        if (cover) {
          if (cover.startsWith('/')) {
            return `${OLD_UPLOAD_URL}${cover}`
          } else {
            return `${OLD_UPLOAD_URL}/${cover}`
          }
        } else {
          return null
        }
      } else { // 手动上传
        if (book.cover) {
          if (book.cover.startsWith('/')) {
            return `${UPLOAD_URL}${book.cover}`
          } else {
            return `${UPLOAD_URL}/${book.cover}`
          }
        } else {
          return null
        }
      }
    }


    // 获取目录树
    static getContentsTree(contents) {
      if (contents) {
        const contentsTree = []
        contents.forEach(c => {
          c.children = []
          if (c.pid === '') { // 当前章节为一级目录
            contentsTree.push(c)
          } else { // 不为一级，寻找父级目录
            const parent = contents.find(_ => _.navId === c.pid)
            parent.children.push(c)
          }
        }) // 将目录转化为树状结构

        return contentsTree
      } else {
        return null
      }
    }
    
}

module.exports = Book;